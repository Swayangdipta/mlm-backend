const jwt = require('jsonwebtoken');

module.exports = (roles = []) => (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!roles.includes(decoded.role)) return res.status(403).json({ message: 'Access denied.' });

    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token' });
  }
};
