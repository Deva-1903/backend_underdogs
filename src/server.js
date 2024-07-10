const path = require("path");
const express = require("express");
const cors = require("cors");
const colors = require("colors");
const dotenv = require("dotenv").config();
const cron = require("node-cron");
const { errorHandler } = require("../src/middleware/errorMiddleware");
const { resetCountersAtMidnight } = require("../src/services/counterReset");
const { removePendingFees } = require("../src/services/removePendingFees");
const { updateUsersStatus } = require("../src/services/updateUserStatus");

const connectDB = require("../config/db");

const port = process.env.PORT;
const app = express();

// Database connection
connectDB();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// Routes
app.get("/", (req, res) => {
  res.status(200).send({ message: "Server is up..." });
});
app.use("/api", require("./routes/homeRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

// Error handler middleware
app.use(errorHandler);

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
      await resetCountersAtMidnight();
    } catch (error) {
      console.error("Error in cron job:", error);
    }
  },
  {
    timezone: "Asia/Kolkata",
  }
);
