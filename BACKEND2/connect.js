const express = require('express');
const serverless = require('serverless-http');
const app = express();
const cors = require('cors');
require("dotenv").config(); 
const moongoose = require('mongoose');
const PORT = 3002;
const MONGODB_URL = 'mongodb+srv://Ananddb:Anand2003@cluster0.hhg4k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const User = require('./models/userSchema');  
  
const userRoutes = require('./routes/userRoutes'); 
const blockchainRouter = require('./routes/blockchain');

app.use(
    cors({
        origin: ["https://render3.vercel.app","http://localhost:3000"], 
        credentials: true, // Allow cookies
    })
);
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
        console.error("Database connection failed:", error);7
    });


process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason);
    process.exit(1);
});

process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    process.exit(1);
});

