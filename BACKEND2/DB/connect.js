const express = require('express');
const app = express();
const cors = require('cors');
require("dotenv").config(); 
const moongoose = require('mongoose');
const PORT = 3000;
const MONGODB_URL = 'mongodb+srv://Ananddb:Anand2003@cluster0.hhg4k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const User = require('../models/userSchema');  
  
const userRoutes = require('../routes/userRoutes'); 
const blockchainRouter = require('../routes/blockchain');

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello, welcome to the react backend!');
});

app.use("/api", userRoutes);
app.use("/api",blockchainRouter)

moongoose.connect(MONGODB_URL, {
    })
    .then(() => {
        console.log("Database connected successfully");

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("Database connection failed:", error);
        setTimeout(() => process.exit(1), 1000); 
    });


process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason);
    process.exit(1);
});

process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    process.exit(1);
});


const BlockHashSchema = require("../models/blockHashSchema")
const storeBlockHash = async (userId, username, blockHash) => {
    try {
        const newBlock = new BlockHashSchema({
            userId,
            username,
            blockHash,
            timestamp: new Date(),
        });

        await newBlock.save();  // Save block hash to the already connected database
        console.log('BlockHash stored successfully');
        return { success: true, message: 'Block hash saved' };
    } catch (error) {
        console.error('Error storing block hash:', error);
        throw new Error('Failed to store block hash');
    }
};

module.exports = storeBlockHash;


// (async () => {
//     try {
//         await moongoose.connect(MONGODB_URL, {
//             useNewUrlParser: true,
//             useUnifiedTopology: true,
//         });
//         console.log('Connected to MongoDB');

//         const username = 'exampleUser'; // Example username
//         const user = await User.findOne({ username });

//         if (!user) {
//             console.error('User not found');
//             return;
//         }

//         // Store blockHash
//         const blockHash = 'a7f48c6d09ab3e';
//         const result = await storeBlockHash(user._id, username, blockHash);
//         console.log(result);
//     } catch (error) {
//         console.error('Error:', error.message);
//     } finally {
//         moongoose.disconnect();
//     }
// })();
