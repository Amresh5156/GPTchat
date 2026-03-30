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
    const io = new Server(httpServer, {
        cors: {
            origin: "http://localhost:5173",
            allowedHeaders: [ "Content-Type", "Authorization" ],
            credentials: true
        }
    })

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
                
                const [message, vectors] = await Promise.all([
                    //createing a message in the database
                    messageModel.create({
                            chat: messagePayLoad.chat,
                            user: socket.user._id,
                            content: messagePayLoad.content,
                            role: "user"
                        }),
                        //generating a vector for the message, because we have to maintain the long term memory using vector database
                        generateVector(messagePayLoad.content),

                        
                ])

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


                const [memory, chatHistory] = await Promise.all([
                    //querying the memory for the message if any similar message is found
                    queryMemory({
                        queryVector: vectors,
                        limit: 5,
                        metadata: {
                            chat: messagePayLoad.chat,
                            user: socket.user._id,
                        },
                    }),
                    //getting the chat history
                    messageModel.find({ chat: messagePayLoad.chat })
                    .sort({ createdAt: -1 })
                    .limit(20)
                    .lean().then(messages => messages.reverse())
                ])


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

                //emitting the response to the client
                socket.emit("ai-response", {
                    content: response,
                    chat: messagePayLoad.chat
                })

                const [responseMessage, responseVectors] = await Promise.all([
                    //Save message in the database for the response
                    messageModel.create({
                        chat: messagePayLoad.chat,
                        user: socket.user._id,
                        content: response,
                        role: "model"
                    }),

                    //generating vector for the response
                    generateVector(response),

                    //Save AI response in Pinecone vector database
                ])
                
                await createMemory({
                    vector: responseVectors,
                    messageId: responseMessage._id,
                    metadata: {
                        chat: messagePayLoad.chat,
                        user: socket.user._id,
                        text: response
                    }
                })

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