const router = require("express").Router();
const authRoutes = require("./auth.routes");
const { schemas, validate } = require("../lib/validation");
const auth = require("../middleware/authAdmin.middleware");
const sessions = require("../lib/sessions");
router.post(
  "/login",
  authRoutes.accountLimit,
  require("../lib/bot"),
  validate(schemas.login),
  authRoutes.login("admin"),
);
router.post("/logout", async (req, res) => {
  await sessions.revokeCookies(req.cookies, req.app.get("io"));
  for (const name of ["user_token", "admin_token"])
    res.clearCookie(name, sessions.cookieOptions());
  res.json({ message: "Signed out" });
});
router.get("/me", auth, (req, res) =>
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
  }),
);
module.exports = router;
