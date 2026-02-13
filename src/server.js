const colors = require("colors");
const dotenv = require("dotenv").config();
const cron = require("node-cron");
const { removePendingFees } = require("../src/services/removePendingFees");
const { updateUsersStatus } = require("../src/services/updateUserStatus");
const connectDB = require("../config/db");
const app = require("./app");

const port = process.env.PORT;

// Database connection
connectDB();

app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});

// This cron job runs every day at 12:00 AM
cron.schedule(
  "0 0 * * *",
  async () => {
    try {
      await removePendingFees();
      await updateUsersStatus();
    } catch (error) {
      console.error("Error in cron job:", error);
    }
  },
  {
    timezone: "Asia/Kolkata",
  }
);
