const { authenticate } = require("../lib/sessions");
module.exports = async (req, res, next) => {
  try {
    const r = await authenticate(req.cookies);
    if (!r) return res.status(401).json({ message: "Please sign in" });
    req.user = r.user;
    req.session = r.session;
    next();
  } catch (e) {
    next(e);
  }
};
