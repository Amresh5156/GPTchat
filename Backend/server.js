require("dotenv").config()
const app = require('./src/app')
const connectDB = require('./src/db/db')
const initSocketServer = require('./src/sockets/socket.server')
const httpServer = require('http').createServer(app)

connectDB()
initSocketServer(httpServer)

process.on("uncaughtException", (err) => {
    console.log("💥 UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
    console.log("💥 UNHANDLED PROMISE:", err);
});

httpServer.listen(3000, () => {
    console.log("Server is running on port 3000");
})