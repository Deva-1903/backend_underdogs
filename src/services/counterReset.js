const asyncHandler = require("express-async-handler");
const Counter = require("../../model/counterModel");
const moment = require("moment-timezone");

// we manage some counters in the db as morning & evening
// which helps us to maintain a count of user entries
exports.resetCountersAtMidnight = async () => {
  try {
    await Counter.findOneAndUpdate(
      { session: "morning" },
      { $set: { count: 1 } },
      { upsert: true }
    );

    await Counter.findOneAndUpdate(
      { session: "evening" },
      { $set: { count: 1 } },
      { upsert: true }
    );
  } catch (error) {
    console.error("Error resetting counters:", error);
  }
};
