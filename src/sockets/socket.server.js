const { Server, Socket } = require("socket.io")
const cookie = require("cookie")
const jwt = require("jsonwebtoken")
const userModel = require("../models/user.model")
const {generateResponse, generateVector} = require("../services/ai.service")
const messageModel = require("../models/message.model")
const { createMemory, queryMemory } = require("../services/vector.service")


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
                
                const message = await messageModel.create({
                    chat: messagePayLoad.chat,
                    user: socket.user._id,
                    content: messagePayLoad.content,
                    role: "user"
                })

                const vectors = await generateVector(messagePayLoad.content)

                await createMemory({
                    vector: vectors,
                    messageId: message._id,
                    metadata: {
                        chat: messagePayLoad.chat,
                        user: socket.user._id
                    }
                })
                console.log("STEP 3: memory stored");
                
                

                const chatHistory = (await messageModel
                    .find({ chat: messagePayLoad.chat })
                    .sort({ createdAt: -1 })
                    .limit(20)
                    .lean()).reverse()
                console.log("STEP 4: history fetched");

                const response = await generateResponse(chatHistory.map(item => {
                    return {
                        role: item.role,
                        parts: [ { text: item.content }]
                    }
                }))
                console.log("AI RESPONSE:", response);
                
                const responseMessage = await messageModel.create({
                    chat: messagePayLoad.chat,
                    user: socket.user._id,
                    content: response,
                    role: "model"
                })

                const responseVectors = await generateVector(response)
 
                await createMemory({
                    vector: responseVectors,
                    messageId: responseMessage._id,
                    metadata: {
                        chat: messagePayLoad.chat,
                        user: socket.user._id,
                        text: response
                    }
                });

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