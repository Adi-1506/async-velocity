const fs = require("fs"),
  path = require("path"),
  dotenv = require("dotenv");
const { productionIssues } = require("../lib/preflight");
const read = (file) =>
  fs.existsSync(file) ? dotenv.parse(fs.readFileSync(file)) : {};
const env = {
  ...read(path.join(__dirname, "../../frontend/.env.local")),
  ...read(path.join(__dirname, "../.env")),
  ...process.env,
};
const issues = productionIssues(env, {
  includeBackups: !process.argv.includes("--app-only"),
});
if (issues.length) {
  console.error(
    "Production configuration is incomplete (values are never printed):",
  );
  for (const issue of issues) console.error("- " + issue);
  process.exitCode = 1;
} else
  console.log(
    "Configuration checks passed. Verify DNS, delivery, backups, access roles and monitoring in the actual deployment before launch.",
  );
