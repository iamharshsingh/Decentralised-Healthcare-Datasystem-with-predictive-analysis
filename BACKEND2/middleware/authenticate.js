const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.SECRET_KEY || "your-secret-key"; // Your JWT secret

// Middleware to authenticate the user via JWT token
const authenticateUser = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];  // Extract token from Authorization header

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }

        req.user = decoded;  // Attach user info to the request object
        next();
    });
};

module.exports = authenticateUser;

// // Store Block Hash Route
// routerH.post('/store-blockhash', authenticateUser, async (req, res) => {
//     try {
//         const { blockHash } = req.body;

//         if (!blockHash) {
//             return res.status(400).json({ error: 'Block hash is required' });
//         }

//         // Retrieve the user from the JWT (req.user contains user info)
//         const userId = req.user.id;
//         const username = req.user.username;

//         // Store block hash for the user
//         const result = await storeBlockHash(userId, username, blockHash); // Assuming storeBlockHash is a function to store this in DB

//         res.status(200).json({
//             message: 'Block hash stored successfully',
//             result,
//         });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'Server error' });
//     }
// });


