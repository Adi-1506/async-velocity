module.exports = function superAdminOnly(req, res, next) {
  if (!req.admin) {
    return res
      .status(401)
      .json({ message: "Access Denied: Not authenticated as admin" });
  }

  if (req.admin.isSuperAdmin !== true) {
    return res
      .status(403)
      .json({ message: "Forbidden: Super Admin access required" });
  }

  next();
};
