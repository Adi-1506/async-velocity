const Team = require("../models/Team");
const { canRead } = require("../lib/access");
const { id } = require("../lib/validation");
module.exports = async (req, res, next) => {
  try {
    const teamId = req.params.teamId || req.body?.teamId || req.query.teamId;
    if (!id.safeParse(teamId).success)
      return res.status(400).json({ message: "Invalid team ID" });
    const team = await Team.findOne({ _id: teamId, deletedAt: null });
    if (!canRead(team, req.user))
      return res.status(403).json({ message: "Team access denied" });
    req.team = team;
    next();
  } catch (e) {
    next(e);
  }
};
