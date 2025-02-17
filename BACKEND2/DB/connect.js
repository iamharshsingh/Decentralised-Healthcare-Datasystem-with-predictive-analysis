const express = require('express');
const serverless = require('serverless-http');
const app = express();
const cors = require('cors');
require("dotenv").config(); 
const moongoose = require('mongoose');
const PORT = 3000;
const MONGODB_URL = process.env.MONGODB_URL 
  
const userRoutes = require('../routes/userRoutes'); 
const blockchainRouter = require('../routes/blockchain');

app.use(
    cors({
        origin: "http://localhost:3001", 
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

    })
    .catch((error) => {
        console.error("Database connection failed:", error);7
    });

module.exports = serverless(app);
