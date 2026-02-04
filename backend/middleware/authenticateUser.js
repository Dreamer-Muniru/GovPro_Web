// backend/middleware/authenticateUser.js
const jwt = require('jsonwebtoken');

const authenticateUser = async(req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('❌ JWT_SECRET is not set on the server. Set it in your deployment environment (e.g. Render).');
    return res.status(500).json({ error: 'Server configuration error. Please try again later.' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded; // contains userId, username, etc.
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};


module.exports = authenticateUser;