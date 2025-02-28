require('dotenv').config();
const { ethers } = require('ethers');
const BN = require('bn.js');
const { parseUnits } = require('ethers');
const express = require('express');
const routerB = express.Router();
const authenticateUser = require("../middleware/authenticateUser")
const User = require('../models/userSchema')

const PRIVATE_KEY = "3ee37d322c95fa45bbbd05e031e9b80019b3f4f40ec6fb438444bb2c37672d63"
const PROVIDER_URL = `https://eth-sepolia.g.alchemy.com/v2/igJwO1ukirxhkpXtmpRkrCzsy84QJund`
const CONTRACT_ADDRESS = "0xf7859d9ac2B83053F1fcae5c7C7E3B06656A3327"// 0xa984359f15A6a3c967F429448ff0C35B929D14B9" 
const CONTRACT_ADDRESS2 ="0xe36cFd4fF3605E7f79d9CbDAe96935E50476643b"
const CONTRACT_ADDRESS3 ="0x7B5E29d4334C1048080c29eaE06FbC67A0e7FAca"
const CONTRACT_ABI = require('../constant/diabetes.json'); 
const CONTRACT_ABI2 = require('../constant/heart.json');  
const CONTRACT_ABI3 = require('../constant/lung.json');

const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
const contract2 = new ethers.Contract(CONTRACT_ADDRESS2, CONTRACT_ABI2, wallet);
const contract3 = new ethers.Contract(CONTRACT_ADDRESS3, CONTRACT_ABI3, wallet);

routerB.get('/blockchain', (req, res) => {
    res.status(200).send("blockchain route is working!");
});

routerB.post('/blockchain/store-diabetes',authenticateUser, async (req, res) => {
    try {
        console.log("Received request to store on blockchain...");
        console.log("Headers:", req.headers);
        console.log("body data:", req.body);

        if (!req.user) {
            console.log("User not authenticated");
            return res.status(403).json({ error: 'User not authenticated' });
        }

        const dataArray = req.body;
        const username = req.user.username;

        if (!Array.isArray(dataArray)) {
            return res.status(400).json({ error: 'Expected an array of data objects' });
        }

        console.log('Received data:', dataArray);

          // Find the user in MongoDB
          const user = await User.findOne({ username });
          if (!user) {
              return res.status(404).json({ error: 'User not found' });
          }
  
          let diabetesTransactionHashes = [];

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

            diabetesTransactionHashes.push(Transaction.hash);
        }   

        await User.updateOne({ username }, { $push: { diabetesTransactionHashes: { $each: diabetesTransactionHashes } } });

        const index = await contract.getRecordCount(); 
        let storedData = null;
        
        if (index > 0n) {
            const rawStoredData = await contract.getDiabetesData(index - 1n);
            storedData = {
                pregnancies: rawStoredData[0].toString(),
                glucose: rawStoredData[1].toString(),
                bloodPressure: rawStoredData[2].toString(),
                skinThickness: rawStoredData[3].toString(),
                insulin: rawStoredData[4].toString(),
                bmi: rawStoredData[5].toString(),
                age: rawStoredData[6].toString(),
                diabetesPedigreeFunction: rawStoredData[7].toString(),
                prediction: rawStoredData[8].toString()
            };
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


routerB.get('/blockchain/diabetes/all-user-records', authenticateUser, async (req, res) => {
    try {
      // Ensure the user is authenticated (req.user populated by auth middleware)
      const username = req.user.username;
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      const txHashes = user.diabetesTransactionHashes;
      if (!txHashes || txHashes.length === 0) {
        return res.status(200).json({ records: [] });
      }
  
      // Process each transaction hash
      const records = await Promise.all(txHashes.map(async (txHash) => {
        // Fetch the transaction receipt
        const receipt = await provider.getTransactionReceipt(txHash);
        if (!receipt) return null;
  
        // Iterate over the logs and try to parse using the contract ABI
        let parsedLog;
        for (let log of receipt.logs) {
          try {
            parsedLog = contract.interface.parseLog(log);
            // Check if this log is for the DataStored event
            if (parsedLog.event === "DataStored") {
              break; // Found the matching log, exit the loop
            }
          } catch (err) {
            // This log doesn't match the event signature; ignore it
            continue;
          }
        }
        if (!parsedLog || !parsedLog.args) return null;
  
        const recordIndex = parsedLog.args[0];
        if (recordIndex === undefined) return null;
  
        // Fetch the record from the contract using the extracted index
        const record = await contract.getRecord(recordIndex);
  
        // Format the record fields (convert BigNumber values to strings)
        return {
          pregnancies: record.pregnancies.toString(),
          glucose: record.glucose.toString(),
          bloodPressure: record.bloodPressure.toString(),
          skinThickness: record.skinThickness.toString(),
          insulin: record.insulin.toString(),
          bmi: record.bmi.toString(),
          age: record.age.toString(),
          diabetesPedigreeFunction: record.diabetesPedigreeFunction.toString(),
          prediction: record.prediction.toString()
        };
      }));
  
      // Filter out null results in case some txHashes didn't yield a valid record
      const filteredRecords = records.filter(record => record !== null);
  
      res.status(200).json({ records: filteredRecords });
    } catch (error) {
      console.error("Error fetching user blockchain records:", error);
      res.status(500).json({ error: 'Failed to fetch user records' });
    }
  });


  // routerB.get('/blockchain/diabetes/record/:index', async (req, res) => {
//     const index = req.params.index; // Get the index from the URL parameter
//     try {
//         const record = await getDiabetesData(index);
//         res.status(200).json(record); // Send the fetched record as a response
//     } catch (error) {
//         console.error("Error fetching record:", error);
//         res.status(500).json({ error: 'Failed to fetch record' });
//     }
// });

// async function getDiabetesData(index) {
//     try {
//         const record = await contract.getRecord(index);
//         console.log("Retrieved record:", record);

//         if (record.diabetesPedigreeFunction == null) 
//             {throw new Error("Missing required fields in the record.");}
//             if (record.prediction == null) 
//             {throw new Error("Missing required fields in the record2."); }

//         const diabetesPedigreeFunction = (BigInt(record.diabetesPedigreeFunction) / BigInt(1e18));


//         console.log(`Record ${index}:`, {
//             pregnancies: record.pregnancies.toString(),
//             glucose: record.glucose.toString(),
//             bloodPressure: record.bloodPressure.toString(),
//             skinThickness: record.skinThickness.toString(),
//             insulin: record.insulin.toString(),
//             bmi: record.bmi.toString(),
//             age: record.age.toString(),
//             diabetesPedigreeFunction: diabetesPedigreeFunction.toString(),
//             prediction: record.prediction.toString()
//         });

//         return {
//             pregnancies: record.pregnancies.toString(),
//             glucose: record.glucose.toString(),
//             bloodPressure: record.bloodPressure.toString(),
//             skinThickness: record.skinThickness.toString(),
//             insulin: record.insulin.toString(),
//             bmi: record.bmi.toString(),
//             age: record.age.toString(),
//             diabetesPedigreeFunction: diabetesPedigreeFunction.toString(),
//             prediction: record.prediction.toString()
//         };
//     } catch (error) {
//         console.error("Error fetching data from blockchain:", error);
//         throw new Error("Error fetching data from blockchain");
//     }
// }

// routerB.get('/blockchain/diabetes/all-records', async (req, res) => {
//     try {
//         const count = await contract.getRecordCount();
//         console.log(`Total records: ${count}`);
        
//         // Declare a records array to hold all diabetes records
//         const records = [];

//         for (let i = 0; i < count; i++) {
//             const record = await getDiabetesData(i); // Fetch the data for each index
//             records.push(record); // Add each fetched record to the array
//         }

//         res.status(200).json({ records }); // Send the records back in the response
//     } catch (error) {
//         console.error("Error fetching all records:", error);
//         res.status(500).json({ error: 'Failed to fetch all records' });
//     }
// }); 
// ------------------------------------------------------------------------------------------------------------

routerB.post('/blockchain/store-heart', authenticateUser,async (req, res) => {
    try {
        console.log("Received request to store on blockchain...");
        console.log("Headers:", req.headers);
        console.log("body data:", req.body);

        if (!req.user) {
            console.log("User not authenticated");
            return res.status(403).json({ error: 'User not authenticated' });
        }
        
        const username = req.user.username;
        const dataArray = req.body;
        

        if (!Array.isArray(dataArray)) {
            return res.status(400).json({ error: 'Expected an array of data objects' });
        }

        console.log('Received data:', dataArray);

        const user = await User.findOne({ username });
          if (!user) {
              return res.status(404).json({ error: 'User not found' });
          }

        let heartTransactionHashes = [];

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

            heartTransactionHashes.push(Transaction.hash);
        }

        await User.updateOne({ username }, { $push: { heartTransactionHashes: { $each: heartTransactionHashes } } });

        // Fetch and return the last record
        const index = await contract2.getRecordCount();
        let storedData = null;
        

        if (index > 0n) {
            const rawStoredData = await contract2.getHeartData(index - 1n);
            storedData = {
                feature1: rawStoredData.feature1.toString(),
                feature2: rawStoredData.feature2.toString(),
                feature3: rawStoredData.feature3.toString(),
                feature4: rawStoredData.feature4.toString(),
                feature5: rawStoredData.feature5.toString(),
                feature6: rawStoredData.feature6.toString(),
                feature7: rawStoredData.feature7.toString(),
                feature8: rawStoredData.feature8.toString(),
                feature9: rawStoredData.feature9.toString(),
                feature10: rawStoredData.feature10.toString(),
                feature11: rawStoredData.feature11.toString(),
                feature12: rawStoredData.feature12.toString(),
                feature13: rawStoredData.feature13.toString(),
                prediction: rawStoredData.prediction.toString()
            };
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


routerB.get('/blockchain/heart/all-user-records', authenticateUser, async (req, res) => {
    try {
      // Ensure the user is authenticated (req.user should be populated by your auth middleware)
      const username = req.user.username;
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      const txHashes = user.heartTransactionHashes;
      if (!txHashes || txHashes.length === 0) {
        return res.status(200).json({ records: [] });
      }
  
      // Process each transaction hash
      const records = await Promise.all(txHashes.map(async (txHash) => {
        // Fetch the transaction receipt
        const receipt = await provider.getTransactionReceipt(txHash);
        if (!receipt) return null;
  
        // Iterate over the logs and try to parse them using the contract's ABI
        let parsedLog;
        for (const log of receipt.logs) {
          try {
            parsedLog = contract2.interface.parseLog(log);
            // Check if this log is for the DataStored event
            if (parsedLog.event === "DataStored") {
              break; // Found the matching log, exit the loop
            }
          } catch (err) {
            // This log doesn't match the event signature; ignore it
            continue;
          }
        }
        if (!parsedLog || !parsedLog.args) return null;
  
        // Access the record index (the first argument of the event)
        const recordIndex = parsedLog.args[0];
        if (recordIndex === undefined) return null;
  
        // Fetch the heart record from the contract using the extracted index
        const record = await contract2.getRecord(recordIndex);
  
        // Format the heart record fields (convert BigNumber values to strings)
        return {
          feature1: record.feature1.toString(),
          feature2: record.feature2.toString(),
          feature3: record.feature3.toString(),
          feature4: record.feature4.toString(),
          feature5: record.feature5.toString(),
          feature6: record.feature6.toString(),
          feature7: record.feature7.toString(),
          feature8: record.feature8.toString(),
          feature9: record.feature9.toString(),
          feature10: record.feature10.toString(),
          feature11: record.feature11.toString(),
          feature12: record.feature12.toString(),
          feature13: record.feature13.toString(),
          prediction: record.prediction.toString()
        };
      }));
  
      // Filter out any null results (in case some txHashes didn't yield a valid record)
      const filteredRecords = records.filter(record => record !== null);
      res.status(200).json({ records: filteredRecords });
    } catch (error) {
      console.error("Error fetching heart blockchain records:", error);
      res.status(500).json({ error: 'Failed to fetch heart records' });
    }
  });


  // routerB.get('/blockchain/heart/record/:index', async (req, res) => {
//     const index = req.params.index; // Get the index from the URL parameter
//     try {
//         const record = await getHeartData(index);
//         res.status(200).json(record); // Send the fetched record as a response
//     } catch (error) {
//         console.error("Error fetching record:", error);
//         res.status(500).json({ error: 'Failed to fetch record' });
//     }
// });
  

// async function getHeartData(index) {
//     try {
//         const record = await contract2.getRecord(index);
//         console.log("Retrieved record:", record);

//         // Assuming all features are part of the record and can be converted to strings
//         const features = [
//             'feature1', 'feature2', 'feature3', 'feature4', 'feature5',
//             'feature6', 'feature7', 'feature8', 'feature9', 'feature10',
//             'feature11', 'feature12', 'feature13', 'prediction'
//         ];

//         const result = features.reduce((acc, feature) => {
//             acc[feature] = record[feature]?.toString();
//             return acc;
//         }, {});

//         console.log(`Record ${index}:`, result);
//         return result;
//     } catch (error) {
//         console.error("Error fetching data from blockchain:", error);
//         throw new Error("Error fetching data from blockchain");
//     }
// }

// routerB.get('/blockchain/heart/all-records',async (req,res)=> {
//     try {
//         const count = await contract.getRecordCount();
//         console.log(`Total records: ${count}`);
        
//         // Declare a records array to hold all diabetes records
//         const records = [];

//         for (let i = 0; i < count; i++) {
//             const record = await getHeartData(i); // Fetch the data for each index
//             records.push(record); // Add each fetched record to the array
//         }

//         res.status(200).json({ records }); // Send the records back in the response
//     } catch (error) {
//         console.error("Error fetching all records:", error);
//         res.status(500).json({ error: 'Failed to fetch all records' });
//     }
// })

//----------------------------------------------------------------------------------------------------------------


// POST route to store lung cancer data on blockchain
routerB.post('/blockchain/store-lung', authenticateUser, async (req, res) => {
  try {
      console.log("Received request to store lung cancer data on blockchain...");
      console.log("Headers:", req.headers);
      console.log("Body data:", req.body);

      if (!req.user) {
          console.log("User not authenticated");
          return res.status(403).json({ error: 'User not authenticated' });
      }

      const dataArray = req.body;
      const username = req.user.username;

      if (!Array.isArray(dataArray)) {
          return res.status(400).json({ error: 'Expected an array of data objects' });
      }

      console.log('Received data:', dataArray);

      const user = await User.findOne({ username });
      if (!user) {
          return res.status(404).json({ error: 'User not found' });
      }

      let lungTransactionHashes = [];

      // Helper function to convert "YES" => 1, "NO" => 0
      const convertToBinary = (value) => (value === "YES" ? 1 : 0);

      for (const data of dataArray) {
          const requiredFields = [
              "AGE", "SMOKING", "YELLOW_FINGERS", "ANXIETY", "PEER_PRESSURE",
              "CHRONIC_DISEASE", "FATIGUE", "ALLERGY", "WHEEZING", "ALCOHOL_CONSUMING",
              "COUGHING", "SHORTNESS_OF_BREATH", "SWALLOWING_DIFFICULTY", "CHEST_PAIN", "prediction"
          ];

          for (const field of requiredFields) {
              if (!data.hasOwnProperty(field)) {
                  console.log(`Missing field: ${field} in`, data);
                  return res.status(400).json({ error: `Missing data field: ${field}` });
              }
          }
          

          // Convert YES/NO fields to 1/0
          const Transaction = await contract3.storeLungCancerData(
            parseInt(data.AGE),
            parseInt(data.SMOKING),
            parseInt(data.YELLOW_FINGERS),
            parseInt(data.ANXIETY),
            parseInt(data.PEER_PRESSURE),
            parseInt(data.CHRONIC_DISEASE),
            parseInt(data.FATIGUE),
            parseInt(data.ALLERGY),
            parseInt(data.WHEEZING),
            parseInt(data.ALCOHOL_CONSUMING),
            parseInt(data.COUGHING),
            parseInt(data.SHORTNESS_OF_BREATH),
            parseInt(data.SWALLOWING_DIFFICULTY),
            parseInt(data.CHEST_PAIN),
            parseInt(data.prediction)
          );

          console.log("Transaction sent! Waiting for confirmation...");
          await Transaction.wait();
          console.log("Data stored successfully on blockchain:", Transaction.hash);

          lungTransactionHashes.push(Transaction.hash);
      }

      await User.updateOne({ username }, { $push: { lungTransactionHashes: { $each: lungTransactionHashes } } });

      const index = await contract3.getRecordCount();
      let storedData = null;

      if (index > 0n) {
          const rawStoredData = await contract3.getLungCancerData(index - 1n);
          storedData = {
            AGE: rawStoredData.AGE.toString(),
            SMOKING: rawStoredData.SMOKING.toString(),
            YELLOW_FINGERS: rawStoredData.YELLOW_FINGERS.toString(),
            ANXIETY: rawStoredData.ANXIETY.toString(),
            PEER_PRESSURE: rawStoredData.PEER_PRESSURE.toString(),
            CHRONIC_DISEASE: rawStoredData.CHRONIC_DISEASE.toString(),
            FATIGUE: rawStoredData.FATIGUE.toString(),
            ALLERGY: rawStoredData.ALLERGY.toString(),
            WHEEZING: rawStoredData.WHEEZING.toString(),
            ALCOHOL_CONSUMING: rawStoredData.ALCOHOL_CONSUMING.toString(),
            COUGHING: rawStoredData.COUGHING.toString(),
            SHORTNESS_OF_BREATH: rawStoredData.SHORTNESS_OF_BREATH.toString(),
            SWALLOWING_DIFFICULTY: rawStoredData.SWALLOWING_DIFFICULTY.toString(),
            CHEST_PAIN: rawStoredData.CHEST_PAIN.toString(),
            prediction: rawStoredData.prediction.toString()
        };
          console.log("Stored Data:", storedData);
          res.status(200).json({ message: 'Data stored successfully', storedData });
      } else {
          res.status(200).json({ message: 'Data stored successfully, but no blockchain records found.' });
      }
  } catch (error) {
      console.error('Error storing lung cancer data on blockchain:', error);
      res.status(500).json({ error: 'Failed to store data on blockchain' });
  }
});

// GET route to retrieve all user's lung cancer records from blockchain
routerB.get('/blockchain/lung/all-user-records', authenticateUser, async (req, res) => {
  try {
      const username = req.user.username;
      const user = await User.findOne({ username });
      if (!user) {
          return res.status(404).json({ error: 'User not found' });
      }

      const txHashes = user.lungTransactionHashes;
      if (!txHashes || txHashes.length === 0) {
        return res.status(200).json({ records: [] });
      }
  
      // Process each transaction hash
      const records = await Promise.all(txHashes.map(async (txHash) => {
        // Fetch the transaction receipt
        const receipt = await provider.getTransactionReceipt(txHash);
        if (!receipt) return null;
  
        // Iterate over the logs and try to parse them using the contract's ABI
        let parsedLog;
        for (const log of receipt.logs) {
          try {
            parsedLog = contract3.interface.parseLog(log);
            // Check if this log is for the DataStored event
            if (parsedLog.event === "DataStored") {
              break; // Found the matching log, exit the loop
            }
          } catch (err) {
            // This log doesn't match the event signature; ignore it
            continue;
          }
        }
        if (!parsedLog || !parsedLog.args) return null;
  
        // Access the record index (the first argument of the event)
        const recordIndex = parsedLog.args[0];
        console.log("Extracted record index:", recordIndex.toString());
        if (recordIndex === undefined) return null;

        const record = await contract3.getRecord(recordIndex);
          return{
            AGE: record.AGE.toString(),
            SMOKING: record.SMOKING.toString(),
            YELLOW_FINGERS: record.YELLOW_FINGERS.toString(),
            ANXIETY: record.ANXIETY.toString(),
            PEER_PRESSURE: record.PEER_PRESSURE.toString(),
            CHRONIC_DISEASE: record.CHRONIC_DISEASE.toString(),
            FATIGUE: record.FATIGUE.toString(),
            ALLERGY: record.ALLERGY.toString(),
            WHEEZING: record.WHEEZING.toString(),
            ALCOHOL_CONSUMING: record.ALCOHOL_CONSUMING.toString(),
            COUGHING: record.COUGHING.toString(),
            SHORTNESS_OF_BREATH: record.SHORTNESS_OF_BREATH.toString(),
            SWALLOWING_DIFFICULTY: record.SWALLOWING_DIFFICULTY.toString(),
            CHEST_PAIN: record.CHEST_PAIN.toString(),
            prediction: record.prediction.toString()
          };
          
        }));
    
        // Filter out null results in case some txHashes didn't yield a valid record
        const filteredRecords = records.filter(record => record !== null);

      res.status(200).json({ records: filteredRecords });
  } catch (error) {
      console.error("Error fetching lung cancer user blockchain records:", error);
      res.status(500).json({ error: 'Failed to fetch user records' });
  }
});

  

// Get lung cancer record from the blockchain
// routerB.get('/blockchain/lung/record/:index', async (req, res) => {
//     const index = req.params.index;
//     try {
//         const record = await getLungCancerData(index);
//         res.status(200).json(record);
//     } catch (error) {
//         console.error("Error fetching lung cancer record:", error);
//         res.status(500).json({ error: 'Failed to fetch record' });
//     }
// });

// // Fetch lung cancer data from blockchain
// async function getLungCancerData(index) {
//     try {
//         const record = await contract3.getRecord(index);
//         console.log("Retrieved record:", record);

//         // Check that the prediction (now stored as LUNG_CANCER) exists
//         if (!record.LUNG_CANCER) {
//             throw new Error("Missing required prediction in the record.");
//         }

//         console.log(`Lung Cancer Record ${index}:`, {
//             AGE: record.AGE.toString(),
//             SMOKING: record.SMOKING.toString(),
//             YELLOW_FINGERS: record.YELLOW_FINGERS.toString(),
//             ANXIETY: record.ANXIETY.toString(),
//             PEER_PRESSURE: record.PEER_PRESSURE.toString(),
//             CHRONIC_DISEASE: record.CHRONIC_DISEASE.toString(),
//             FATIGUE: record.FATIGUE.toString(),
//             ALLERGY: record.ALLERGY.toString(),
//             WHEEZING: record.WHEEZING.toString(),
//             ALCOHOL_CONSUMING: record.ALCOHOL_CONSUMING.toString(),
//             COUGHING: record.COUGHING.toString(),
//             SHORTNESS_OF_BREATH: record.SHORTNESS_OF_BREATH.toString(),
//             SWALLOWING_DIFFICULTY: record.SWALLOWING_DIFFICULTY.toString(),
//             CHEST_PAIN: record.CHEST_PAIN.toString(),
//             LUNG_CANCER: record.LUNG_CANCER
//         });

//         return {
//             AGE: record.AGE.toString(),
//             SMOKING: record.SMOKING.toString(),
//             YELLOW_FINGERS: record.YELLOW_FINGERS.toString(),
//             ANXIETY: record.ANXIETY.toString(),
//             PEER_PRESSURE: record.PEER_PRESSURE.toString(),
//             CHRONIC_DISEASE: record.CHRONIC_DISEASE.toString(),
//             FATIGUE: record.FATIGUE.toString(),
//             ALLERGY: record.ALLERGY.toString(),
//             WHEEZING: record.WHEEZING.toString(),
//             ALCOHOL_CONSUMING: record.ALCOHOL_CONSUMING.toString(),
//             COUGHING: record.COUGHING.toString(),
//             SHORTNESS_OF_BREATH: record.SHORTNESS_OF_BREATH.toString(),
//             SWALLOWING_DIFFICULTY: record.SWALLOWING_DIFFICULTY.toString(),
//             CHEST_PAIN: record.CHEST_PAIN.toString(),
//             LUNG_CANCER: record.LUNG_CANCER
//         };
//     } catch (error) {
//         console.error("Error fetching data from blockchain:", error);
//         throw new Error("Error fetching data from blockchain");
//     }
// }

// routerB.get('/blockchain/lung/all-records', async (req, res) => {
//     try {
//         const count = await contract3.getRecordCount();
//         console.log(`Total lung cancer records: ${count}`);

//         // Array to store all lung cancer records
//         const records = [];

//         for (let i = 0; i < count; i++) {
//             const record = await getLungCancerData(i); // Fetch each record
//             records.push(record);
//         }

//         res.status(200).json({ records });
//     } catch (error) {
//         console.error("Error fetching all lung cancer records:", error);
//         res.status(500).json({ error: 'Failed to fetch all records' });
//     }
// });



module.exports = routerB;




