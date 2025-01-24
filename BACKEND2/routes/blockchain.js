require('dotenv').config();
const { ethers } = require('ethers');
const BN = require('bn.js');
const { parseUnits } = require('ethers');
const express = require('express');
const routerB = express.Router();
const authenticateUser = require("../middleware/authenticate")

const PRIVATE_KEY = "3ee37d322c95fa45bbbd05e031e9b80019b3f4f40ec6fb438444bb2c37672d63"
const PROVIDER_URL = `https://eth-sepolia.g.alchemy.com/v2/igJwO1ukirxhkpXtmpRkrCzsy84QJund`
const CONTRACT_ADDRESS = "0xf7859d9ac2B83053F1fcae5c7C7E3B06656A3327"// 0xa984359f15A6a3c967F429448ff0C35B929D14B9" 
const CONTRACT_ADDRESS2 ="0x87FFFdaafc872AD695834F6C5988f39C4216827A"
const CONTRACT_ABI = require('../constant/diabetes.json'); 
const CONTRACT_ABI2 = require('../constant/heart.json');  

const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
const contract2 = new ethers.Contract(CONTRACT_ADDRESS2, CONTRACT_ABI2, wallet);

routerB.get('/blockchain', (req, res) => {
    res.status(200).send("blockchain route is working!");
});

routerB.post('/blockchain/store-diabetes', async (req, res) => {
    try {
        const dataArray = req.body;

        if (!Array.isArray(dataArray)) {
            return res.status(400).json({ error: 'Expected an array of data objects' });
        }

        console.log('Received data:', dataArray);

        for (const data of dataArray) {
            if (!data.pregnancies || !data.glucose || !data.bloodPressure || !data.skinThickness || 
                !data.insulin || !data.bmi || !data.age || !data.diabetesPedigreeFunction || !data.prediction) {
                console.log("Missing data fields in:", data);
                return res.status(400).json({ error: 'Missing data fields' });
            }

            const Transaction = await contract.storeDiabetesData(
                data.pregnancies,
                data.glucose,
                data.bloodPressure,
                data.skinThickness,
                data.insulin,
                data.bmi,
                data.age,
                parseUnits(data.diabetesPedigreeFunction.toString(), 18),
                data.prediction
            );

            console.log("Transaction sent! Waiting for confirmation...");
            await Transaction.wait(); 
            console.log("Data stored successfully on blockchain:", Transaction.hash);
        }   

        const index = await contract.getRecordCount(); 
        let storedData = null;
        if (index > 0n) {
            storedData = await getDiabetesData(index - 1n); 
            console.log("Stored Data:", storedData);
            res.status(200).json({
                message: 'Data stored successfully',
                storedData
            });
        } else {
            console.log("No records available.");
        } 

    } catch (error) {
        console.error('Error storing data to blockchain:', error);
        res.status(500).json({ error: 'Failed to store data on blockchain' });
    }
});

routerB.get('/blockchain/diabetes/record/:index', async (req, res) => {
    const index = req.params.index; // Get the index from the URL parameter
    try {
        const record = await getDiabetesData(index);
        res.status(200).json(record); // Send the fetched record as a response
    } catch (error) {
        console.error("Error fetching record:", error);
        res.status(500).json({ error: 'Failed to fetch record' });
    }
});

async function getDiabetesData(index) {
    try {
        const record = await contract.getRecord(index);
        console.log("Retrieved record:", record);

        if (record.diabetesPedigreeFunction == null) 
            {throw new Error("Missing required fields in the record.");}
            if (record.prediction == null) 
            {throw new Error("Missing required fields in the record2."); }

        const diabetesPedigreeFunction = (BigInt(record.diabetesPedigreeFunction) / BigInt(1e18));


        console.log(`Record ${index}:`, {
            pregnancies: record.pregnancies.toString(),
            glucose: record.glucose.toString(),
            bloodPressure: record.bloodPressure.toString(),
            skinThickness: record.skinThickness.toString(),
            insulin: record.insulin.toString(),
            bmi: record.bmi.toString(),
            age: record.age.toString(),
            diabetesPedigreeFunction: diabetesPedigreeFunction.toString(),
            prediction: record.prediction.toString()
        });

        return {
            pregnancies: record.pregnancies.toString(),
            glucose: record.glucose.toString(),
            bloodPressure: record.bloodPressure.toString(),
            skinThickness: record.skinThickness.toString(),
            insulin: record.insulin.toString(),
            bmi: record.bmi.toString(),
            age: record.age.toString(),
            diabetesPedigreeFunction: diabetesPedigreeFunction.toString(),
            prediction: record.prediction.toString()
        };
    } catch (error) {
        console.error("Error fetching data from blockchain:", error);
        throw new Error("Error fetching data from blockchain");
    }
}


routerB.post('/blockchain/store-heart', async (req, res) => {
    try {
        const dataArray = req.body;

        if (!Array.isArray(dataArray)) {
            return res.status(400).json({ error: 'Expected an array of data objects' });
        }

        console.log('Received data:', dataArray);

        for (const data of dataArray) {
            // Validate all required fields (feature1 to feature13)
            const requiredFields = [
                'feature1', 'feature2', 'feature3', 'feature4', 'feature5',
                'feature6', 'feature7', 'feature8', 'feature9', 'feature10',
                'feature11', 'feature12', 'feature13','prediction'
            ];

            const missingFields = requiredFields.filter(field => data[field] === undefined || data[field] === null);

            if (missingFields.length > 0) {
                console.log("Missing data fields in:", data, "Missing:", missingFields);
                return res.status(400).json({ error: `Missing fields: ${missingFields.join(', ')}` });
            }

            // Store data on the blockchain
            const Transaction = await contract2.storeHeartData(
                data.feature1,
                data.feature2,
                data.feature3,
                data.feature4,
                data.feature5,
                data.feature6,
                data.feature7,
                data.feature8,
                data.feature9,
                data.feature10,
                data.feature11,
                data.feature12,
                data.feature13,
                data.prediction
            );

            console.log("Transaction sent! Waiting for confirmation...");
            await Transaction.wait();
            console.log("Data stored successfully on blockchain:", Transaction.hash);
        }

        // Fetch and return the last record
        const index = await contract2.getRecordCount();
        let storedData = null;

        if (index > 0n) {
            storedData = await getHeartData(index - 1n);
            console.log("Stored Data:", storedData);
            res.status(200).json({
                message: 'Data stored successfully',
                storedData
            });
        } else {
            console.log("No records available.");
            res.status(200).json({ message: 'Data stored successfully, but no records available.' });
        }
    } catch (error) {
        console.error('Error storing data to blockchain:', error);
        res.status(500).json({ error: 'Failed to store data on blockchain' });
    }
});

routerB.get('/blockchain/heart/record/:index', async (req, res) => {
    const index = req.params.index; // Get the index from the URL parameter
    try {
        const record = await getHeartData(index);
        res.status(200).json(record); // Send the fetched record as a response
    } catch (error) {
        console.error("Error fetching record:", error);
        res.status(500).json({ error: 'Failed to fetch record' });
    }
});

async function getHeartData(index) {
    try {
        const record = await contract2.getRecord(index);
        console.log("Retrieved record:", record);

        // Assuming all features are part of the record and can be converted to strings
        const features = [
            'feature1', 'feature2', 'feature3', 'feature4', 'feature5',
            'feature6', 'feature7', 'feature8', 'feature9', 'feature10',
            'feature11', 'feature12', 'feature13', 'prediction'
        ];

        const result = features.reduce((acc, feature) => {
            acc[feature] = record[feature]?.toString();
            return acc;
        }, {});

        console.log(`Record ${index}:`, result);
        return result;
    } catch (error) {
        console.error("Error fetching data from blockchain:", error);
        throw new Error("Error fetching data from blockchain");
    }
}

routerB.get('/blockchain/diabetes/all-records', async (req, res) => {
    try {
        const count = await contract.getRecordCount();
        console.log(`Total records: ${count}`);
        
        // Declare a records array to hold all diabetes records
        const records = [];

        for (let i = 0; i < count; i++) {
            const record = await getDiabetesData(i); // Fetch the data for each index
            records.push(record); // Add each fetched record to the array
        }

        res.status(200).json({ records }); // Send the records back in the response
    } catch (error) {
        console.error("Error fetching all records:", error);
        res.status(500).json({ error: 'Failed to fetch all records' });
    }
});


routerB.get('/blockchain/heart/all-records',async (req,res)=> {
    try {
        const count = await contract.getRecordCount();
        console.log(`Total records: ${count}`);
        
        // Declare a records array to hold all diabetes records
        const records = [];

        for (let i = 0; i < count; i++) {
            const record = await getHeartData(i); // Fetch the data for each index
            records.push(record); // Add each fetched record to the array
        }

        res.status(200).json({ records }); // Send the records back in the response
    } catch (error) {
        console.error("Error fetching all records:", error);
        res.status(500).json({ error: 'Failed to fetch all records' });
    }
})


const storeBlockHash = require('../DB/connect');
routerB.post('/store-blockhash', authenticateUser, async (req, res) => {
    try {
        const { blockHash } = req.body;

        if (!blockHash) {
            return res.status(400).json({ error: 'Block hash is required' });
        }

        // Retrieve the user from the JWT (req.user contains user info)
        const userId = req.user.id;
        const username = req.user.username;

        // Store block hash for the user
        const result = await storeBlockHash(userId, username, blockHash); // Assuming storeBlockHash is a function to store this in DB

        res.status(200).json({
            message: 'Block hash stored successfully',
            result,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});


module.exports = routerB;




