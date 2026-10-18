const cookie = require("cookie");
const { authenticate } = require("./sessions");
const Team = require("../models/Team");
const { canRead } = require("./access");
const { id } = require("./validation");
function attach(io) {
  io.use(async (socket, next) => {
    try {
      const cookies = cookie.parseCookie(socket.request.headers.cookie || "");
      const result = await authenticate(cookies);
      if (!result) return next(new Error("Unauthorized"));
      socket.data.cookies = cookies;
      socket.data.auth = result;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });
  io.on("connection", (socket) => {
    const { user, session } = socket.data.auth;
    socket.join("user:" + user._id);
    socket.join("session:" + session._id);
    const expiry = setTimeout(
      () => socket.disconnect(true),
      Math.max(0, session.expiresAt - Date.now()),
    );
    expiry.unref();
    socket.on("disconnect", () => clearTimeout(expiry));
    socket.on("join_team", async (teamId, ack) => {
      const respond = typeof ack === "function" ? ack : () => {};
      try {
        const current = await authenticate(socket.data.cookies);
        if (!current || !id.safeParse(teamId).success)
          return respond({ error: "Access denied" });
        const t = await Team.findOne({ _id: teamId, deletedAt: null });
        if (!canRead(t, current.user))
          return respond({ error: "Access denied" });
        for (const room of socket.rooms)
          if (room.startsWith("team:")) socket.leave(room);
        await socket.join("team:" + teamId);
        respond({ ok: true });
      } catch {
        respond({ error: "Access denied" });
      }
    });
  });
}
module.exports = { attach };
