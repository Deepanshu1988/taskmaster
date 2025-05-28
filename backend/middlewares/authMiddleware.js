const jwt = require('jsonwebtoken');

// Fallback JWT secret if not set in env
const DEFAULT_JWT_SECRET = 'taskmaster_default_secret_2025';

module.exports = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  console.log('Auth header:', authHeader);
  
  if (!authHeader) {
    console.log('No Authorization header found');
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.replace('Bearer ', '');
  console.log('Token received:', token ? 'Token exists' : 'No token found');
  
  if (!token) {
    console.log('No token found in Authorization header');
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const secret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
    console.log('Using JWT secret:', secret ? 'Secret exists' : 'No secret found');
    
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    console.log('Decoded token:', decoded);
    
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        details: error.message
      });
    }
    
    res.status(401).json({ 
      error: 'Invalid token',
      details: error.message 
    });
  }
};