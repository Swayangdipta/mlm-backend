const jwt = require('jsonwebtoken');

function adminMiddleware(req, res, next) {
  try {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ message: 'Access denied' });

    req.adminId = decoded.adminId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = adminMiddleware;