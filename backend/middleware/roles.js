module.exports.requireRole = (role) => (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (user.role !== role && user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  } catch (e) {
    res.status(401).json({ message: 'Unauthorized' });
  }
};
