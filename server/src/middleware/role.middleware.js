const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    res.status(401);
    return next(new Error("Authentication required"));
  }

  if (!roles.includes(req.user.role)) {
    res.status(403);
    return next(new Error("You do not have permission to access this resource"));
  }

  return next();
};

module.exports = { authorizeRoles };
