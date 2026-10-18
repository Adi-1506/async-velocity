require("dotenv").config();
const mongoose = require("mongoose");
require("../app").createApp();
(async () => {
  await mongoose.connect(
    process.env.MIGRATION_MONGO_URI || process.env.MONGO_URI,
    { autoIndex: false, autoCreate: false },
  );
  for (const model of Object.values(mongoose.models)) {
    await model.createCollection();
    await model.createIndexes();
  }
  console.log(
    "Collections and additive indexes are ready. No documents or indexes were deleted.",
  );
})()
  .catch(() => {
    console.error(
      "Migration failed. Check credentials and duplicate-index conflicts.",
    );
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
