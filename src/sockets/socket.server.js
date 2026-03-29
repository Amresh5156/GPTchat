const { Server, Socket } = require("socket.io")
const cookie = require("cookie")
const jwt = require("jsonwebtoken")
const userModel = require("../models/user.model")
const {generateResponse, generateVector} = require("../services/ai.service")
const messageModel = require("../models/message.model")
const { createMemory, queryMemory } = require("../services/vector.service")
const { chat } = require("@pinecone-database/pinecone/dist/assistant/data/chat")
const { text } = require("express")


function initSocketServer(httpServer) {
    const io = new Server(httpServer, {})

    //middleware to check if the user is login before stablish the connection
    io.use( async (socket, next) => { 
        const cookies = cookie.parse(socket.handshake.headers.cookie || "")
        
        if(!cookies.token) {
            return next(new Error("Unauthorised user: token nhi h"));
        }           
        
        try {
            const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET)
            const user = await userModel.findById(decoded.id)
            if (!user) {
                return next(new Error("User not found"));
            }
            socket.user = user
            next()
        }
        catch(err) {
            console.log("[socket auth] JWT verification or user lookup failed:", err?.message || err)
            next(new Error("Unauthorised user"))
        }
        
    })

    io.on("connection", (socket) => {
        
        socket.on("ai-message", async (messagePayLoad) => {

            try {
                
                //createing a message in the database
                const message = await messageModel.create({
                    chat: messagePayLoad.chat,
                    user: socket.user._id,
                    content: messagePayLoad.content,
                    role: "user"
                })
                
                //generating a vector for the message, because we have to maintain the long term memory using vector database 
                const vectors = await generateVector(messagePayLoad.content)

                //creating a memory for the message vector
                await createMemory({
                    vector: vectors,
                    messageId: message._id,
                    metadata: {
                        chat: messagePayLoad.chat,
                        user: socket.user._id,
                        text: messagePayLoad.content
                    }
                })
                console.log("STEP 3: memory stored");
                
                //querying the memory for the message if any similar message is found
                const memory = await queryMemory({
                    queryVector: vectors,
                    limit: 5,
                    metadata: {
                        chat: messagePayLoad.chat,
                        user: socket.user._id,
                    },
                })
                console.log(memory);
                

                //getting the chat history
                const chatHistory = (await messageModel
                    .find({ chat: messagePayLoad.chat })
                    .sort({ createdAt: -1 })
                    .limit(20)
                    .lean()).reverse()
                console.log("STEP 4: history fetched");

                const stm = chatHistory.map(item => {
                    return {
                        role: item.role,
                        parts: [ { text: item.content }]
                    }
                })

                const ltm = [
                    {
                        role: "user",
                        parts: [ {
                            text: `
                            these are some previous messages from the chat, use them to generate the response 
                            ${memory.map(item => item.metadata.text).join("\n")}
                            `
                        }]
                    }
                ]

                //generating a response for the message, and map all the previous messages
                const response = await generateResponse([...ltm, ...stm])
                console.log("AI RESPONSE:", response);
                

                //creating a message in the database for the response
                const responseMessage = await messageModel.create({
                    chat: messagePayLoad.chat,
                    user: socket.user._id,
                    content: response,
                    role: "model"
                })

                //generating a vector for the response
                const responseVectors = await generateVector(response)

                //creating a memory for the response
                await createMemory({
                    vector: responseVectors,
                    messageId: responseMessage._id,
                    metadata: {
                        chat: messagePayLoad.chat,
                        user: socket.user._id,
                        text: response
                    }
                });

                //emitting the response to the client
                socket.emit("ai-response", {
                    content: response,
                    chat: messagePayLoad.chat
                })
                console.log("STEP 6: response emitted");

            } catch (err) {
                console.log("[ai-message] failed:", err?.message || err)
                socket.emit("ai-error", {
                    message: "Failed to process AI message."
                })
            }
        });
    console.log("new socket connnection:", socket.id);
    
    });
}

module.exports = initSocketServer;