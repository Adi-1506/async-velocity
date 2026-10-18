const { z } = require("zod");
const moment = require("moment-timezone");
const id = z.string().regex(/^[a-f\d]{24}$/i);
const email = z.string().trim().toLowerCase().email().max(254);
const password = z
  .string()
  .min(12)
  .max(72)
  .refine(
    (v) => Buffer.byteLength(v) <= 72,
    "Password must be at most 72 bytes",
  );
const text = z.string().trim().min(1).max(4000);
const settings = z.object({
  standupTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timezone: z.string().refine((v) => !!moment.tz.zone(v), "Invalid timezone"),
  digestFrequency: z.enum(["daily", "weekly"]),
  workdays: z
    .array(z.number().int().min(1).max(7))
    .min(1)
    .max(7)
    .refine((v) => new Set(v).size === v.length),
});
const schemas = {
  login: z
    .object({
      email,
      password: z.string().min(1).max(200),
      code: z
        .string()
        .regex(/^\d{6}$/)
        .optional(),
      website: z.string().max(0).optional(),
    })
    .strict(),
  register: z
    .object({
      name: z.string().trim().min(1).max(100),
      email,
      password,
      website: z.string().max(0).optional(),
    })
    .strict(),
  standup: z
    .object({
      teamId: id,
      yesterday: text,
      today: text,
      blockers: z.string().trim().max(4000).default("None"),
      mood: z.enum(["great", "good", "meh", "blocked"]).default("good"),
    })
    .strict(),
  settings: settings.partial().strict(),
  team: settings
    .partial()
    .extend({ name: z.string().trim().min(1).max(100) })
    .strict(),
  invite: z.object({ email }).strict(),
};
function validate(schema) {
  return (req, res, next) => {
    const r = schema.safeParse(req.body);
    if (!r.success)
      return res.status(400).json({
        message: "Invalid input",
        fields: r.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      });
    req.body = r.data;
    next();
  };
}
function pagination(req) {
  const p = z
    .object({
      page: z.coerce.number().int().min(1).max(10000).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(25),
    })
    .parse(req.query);
  return { ...p, skip: (p.page - 1) * p.limit };
}
function dateKey(value, timezone) {
  if (value === undefined) return moment().tz(timezone).format("YYYY-MM-DD");
  if (typeof value !== "string" || !moment(value, "YYYY-MM-DD", true).isValid())
    throw Object.assign(new Error("Invalid date"), { status: 400 });
  return value;
}
module.exports = {
  z,
  id,
  email,
  password,
  schemas,
  validate,
  pagination,
  dateKey,
};
