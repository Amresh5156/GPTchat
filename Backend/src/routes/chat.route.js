const express = require('express')
const { authUser } = require("../middlewares/auth.middleware");
const { createChat, getChats, getMessages } = require('../controllers/chat.controller');

const router = express.Router();

/**POST /api/chat */
router.post('/create', authUser, createChat )

/* GET /api/chat/ */
router.get('/', authUser, getChats)


/* GET /api/chat/messages/:id */
router.get('/messages/:id', authUser, getMessages)


module.exports = router