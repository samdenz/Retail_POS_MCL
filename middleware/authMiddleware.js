// middleware/authMiddleware.js
module.exports = function requireRole(role) {
  return (req, res, next) => {
    const userRole = req.headers['x-user-role'];

    if (!userRole) {
      return res.status(401).json({ message: 'Role not provided' });
    }

    if (userRole !== role) {
      return res.status(403).json({ message: 'Access denied' });
    }

    next();
  };
};
