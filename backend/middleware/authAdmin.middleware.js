const { authenticate } = require("../lib/sessions");
module.exports = async (req, res, next) => {
  try {
    const r = await authenticate(req.cookies, true);
    if (!r)
      return res
        .status(401)
        .json({ message: "Please sign in as an administrator" });
    req.user = r.user;
    req.admin = {
      _id: r.user._id,
      role: r.user.role,
      isSuperAdmin: r.user.role === "superadmin",
    };
    req.session = r.session;
    next();
  } catch (e) {
    next(e);
  }
};
