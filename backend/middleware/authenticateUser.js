// backend/middleware/authenticateUser.js
const jwt = require('jsonwebtoken');

const authenticateUser = async(req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
     const decoded = await jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // contains userId, username, etc.
    console.log('Decoded token:', decoded);
    console.log('Authenticated user:', req.user);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};


module.exports = authenticateUser;