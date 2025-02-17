const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/userSchema.js');
const routerUser = express.Router();
const multer = require('../middleware/multer.middleware');
const upload = require('../middleware/multer.middleware.js')
require('dotenv').config();
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const cookieParser = require('cookie-parser');
app.use(cookieParser());

const SECRET_KEY = process.env.SECRET_KEY || "my_super_secret_key";
const REFRESH_SECRET_KEY = process.env.REFRESH_SECRET_KEY || "my_super_refresh_secret_key";



// Health check
routerUser.get('/user', (req, res) => {
    res.status(200).send('User route is working!');
});

// Register a new user
routerUser.post('/user/register', async (req, res) => {
    try {
        console.log('register route is working!');
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        if (typeof username !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ error: 'Invalid input. Username and password must be strings.' });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            username: username,
            password: hashedPassword
        });

        const accessToken = generateAccessToken(newUser);
        const refreshToken = generateRefreshToken(newUser);

        // Set refresh token as an HTTP-only cookie
        res.cookie('refreshToken', refreshToken, {
            secure: true, // Ensure secure cookies in production (HTTPS)
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.status(201).json({ message: 'User registered successfully',
             user:  { _id: newUser._id, username: newUser.username }, 
             accessToken,
            refreshToken
         });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error' });
    }
});

//  Get all users
routerUser.get('/user/allusers', async (req, res) => {
    try {
        const users = await User.find({}, '-password'); // Exclude password field
        res.status(200).json(users);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error' });
    }
});

//  Get a specific user by ID
routerUser.get('user/getuserbyid/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id, '-password'); // Exclude password
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Utility function to generate tokens
const generateAccessToken = (user) => {
    return jwt.sign({ id: user._id, username: user.username }, SECRET_KEY, { expiresIn: '1d' });
};

const generateRefreshToken = (user) => {
    return jwt.sign({ id: user._id, username: user.username }, REFRESH_SECRET_KEY, { expiresIn: '7d' });
};

routerUser.post('/user/login', async (req, res) => {
    try {
        console.log('Login route is working!');
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Find the user
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        // Generate new tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Set refresh token in HTTP-only cookie
        res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, maxAge: 7 * 24 * 60 * 60 * 1000 });

        // Send only the accessToken in response
        res.status(200).json({
            message: 'Login successful',
            accessToken, // Store this in LocalStorage in frontend
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});


// Login route to generate access and refresh tokens
// routerUser.post('/user/login', async (req, res) => {
//     try {
//         console.log('login route is working!');
//         const { username, password } = req.body;

//         if (!username || !password) {
//             return res.status(400).json({ error: 'Username and password are required' });
//         }

//              // Check if tokens already exist
//              const existingRefreshToken = req.cookies?.refreshToken;
//              let accessToken = req.headers.authorization?.split(' ')[1]; // Extract from Authorization header
     
//              if (existingRefreshToken && accessToken) {
//                  // Verify existing tokens
//                  try {
//                      jwt.verify(existingRefreshToken, REFRESH_SECRET_KEY);
//                      jwt.verify(accessToken, SECRET_KEY);
     
//                      // If tokens are valid, skip further checks and return success
//                      return res.status(200).json({ message: 'Already logged in' });
//                  } catch (error) {
//                      console.log('Invalid or expired tokens. Proceeding with username/password verification.');
//                  }
//              }

//         const user = await User.findOne({ username });
//         if (!user) {
//             return res.status(400).json({ error: 'Invalid username or password' });
//         }

//         const isPasswordValid = await bcrypt.compare(password, user.password);
//         if (!isPasswordValid) {
//             return res.status(400).json({ error: 'Invalid username or password' });
//         }


//         // Generate new tokens
//         accessToken = generateAccessToken(user);
//         const refreshToken = generateRefreshToken(user);

//         // Set refresh token in a secure cookie
//         res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, maxAge: 7 * 24 * 60 * 60 * 1000 });

//         res.status(200).json({
//             message: 'Login successful',
//             accessToken,
//             refreshToken,
//         });

//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'Server error' });
//     }
// });

routerUser.post('/user/refresh', async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ error: 'Refresh token is missing' });
        }

        jwt.verify(refreshToken, REFRESH_SECRET_KEY, async (err, decoded) => {
            if (err) {
                return res.status(403).json({ error: 'Invalid refresh token' });
            }

            // Fetch user from database
            const user = await User.findById(decoded.id);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Generate new access token
            const newAccessToken = generateAccessToken(user);

            // Optionally, refresh the refresh token if it’s close to expiry
            const newRefreshToken = generateRefreshToken(user);
            res.cookie('refreshToken', newRefreshToken, { httpOnly: true, secure: true, maxAge: 7 * 24 * 60 * 60 * 1000 });

            res.status(200).json({ accessToken: newAccessToken });
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});


// routerUser.post('/user/refresh', async (req, res) => {
//     try {
//         const { refreshToken } =  req.cookies?.refreshToken;

//         if (!refreshToken) {
//             return res.status(401).json({ error: 'Refresh token is missing' });
//         }

      
//         verify(refreshToken, REFRESH_SECRET_KEY, (err, user) => {
//             if (err) {
//                 return res.status(403).json({ error: 'Invalid refresh token' });
//             }

           
//             const newAccessToken = generateAccessToken(user);

//             res.status(200).json({ accessToken: newAccessToken });
//         });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'Server error' });
//     }
// });


routerUser.post('/user/upload', (req, res) => {
    upload(req, res, (err) => {
        try {
            if (err) {
                if (err instanceof multer.MulterError) {
                    return res.status(400).json({ error: 'Multer error: ' + err.message });
                }
                return res.status(400).json({ error: 'Error: ' + err.message });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            res.status(200).json({
                message: 'Image uploaded successfully',
                file: req.file,
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error uploading the image' });
        }
    });
});

module.exports = routerUser