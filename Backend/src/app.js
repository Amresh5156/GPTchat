require('dotenv').config()
const express = require("express");
const cookieParser = require("cookie-parser");
const authRoutes = require('./routes/auth.route')
const chatRoutes = require('./routes/chat.route')
const cors = require('cors')

const app = express();

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use("/api/chat", chatRoutes);

module.exports = app;