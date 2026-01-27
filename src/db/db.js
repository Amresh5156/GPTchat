const mongoose = require("mongoose")


async function connectDB(){

    try{
        await mongoose.connect(process.env.MONGO_URI)
        console.log("connect to db");
    }
    catch(err){
        console.error("error connecting to DB :", err);
    }
    
} 

module.exports = connectDB