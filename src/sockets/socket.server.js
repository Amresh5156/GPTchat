const { Server } = require("socket.io")
const cookie = require("cookie")
const jwt = require("jsonwebtoken")
const userModel = require("../models/user.model")
const generateContent = require("../services/ai.service")

function initSocketServer(httpServer) {
    const io = new Server(httpServer, {})

    //middleware
    io.use( async (socket, next) => {
        const cookies = cookie.parse(socket.handshake.headers?.cookie || "")

        if(!cookies.token) {
            return next(new Error("Unauthorised user"))
        }      
        
        try {

            const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET)

            const user = await userModel.findById(decoded.id)

            if(!user) {
                return next(new Error("Unauthorised user"))
            }

            socket.user = user

            next()
        }
        catch(err) {
            return next(new Error("Unauthorised user"))
        }
        
    })

    io.on("connection", (socket) => {
        
        socket.on("ai-message", async (message) => {
            const response = await generateContent(message.content)
            socket.emit("ai-response", {
                content: response,
                chat: response.chat
            })
        });

    });
}

module.exports = initSocketServer;