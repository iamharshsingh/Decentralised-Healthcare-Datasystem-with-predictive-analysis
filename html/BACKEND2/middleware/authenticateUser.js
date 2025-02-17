const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.SECRET_KEY || "my_super_secret_key" ;

const authenticateUser = (req, res, next) => {
    const authHeader = req.headers.authorization;

    console.log("Authorization Header Received:", authHeader); // ✅ Log the received token

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.log(" No Bearer token provided");
        return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];
    console.log("Extracted Token:", token);

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            console.log("❌ Token verification failed:", err.message);
            return res.status(403).json({ error: "Forbidden: Invalid or expired token" });
        }

        console.log("✅ Token verified successfully:", decoded);
        req.user = decoded; // Attach user details to request object
        next();
    });
};

module.exports = authenticateUser;



// // Middleware to authenticate the user via JWT token
// const authenticateUser = (req, res, next) => {
//     const token = req.headers['authorization']?.split(' ')[1];  // Extract token from Authorization header

//     if (!token) {
//         return res.status(401).json({ error: 'No token provided' });
//     }

//     jwt.verify(token, SECRET_KEY, (err, decoded) => {
//         if (err) {
//             return res.status(403).json({ error: 'Invalid or expired token' });
//         }

//         req.user = decoded;  // Attach user info to the request object
//         next();
//     });
// };

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


