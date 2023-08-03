const path = require("path");
const express = require("express");
const cors = require("cors");
const colors = require("colors");
const dotenv = require("dotenv").config();
const cron = require("node-cron");

const connectDB = require("../config/db");

const { errorHandler } = require("../src/middleware/errorMiddleware");
const {
  resetCountersAtMidnight,
} = require("../src/controllers/homeController");
const User = require("../model/userModel");
const PendingFees = require("../model/pendingFeesModel");
const Counter = require("../model/counterModel");

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

// Function to remove pending fees
const removePendingFees = async () => {
  const currentDate = new Date();
  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(currentDate.getDate() - 10);

  try {
    const result = await PendingFees.deleteMany({
      paymentStatus: "paid",
      createdAt: { $lt: tenDaysAgo },
    });

    console.log(`Successfully removed ${result.deletedCount} pending fees.`);
  } catch (error) {
    console.error("Error removing pending fees:", error);
  }
};

// Function to update user status
const updateUsersStatus = async () => {
  const currentDate = new Date();

  const users = await User.find({ status: "active" });

  for (const user of users) {
    try {
      const planEnds = new Date(user.planEnds);

      if (planEnds < currentDate) {
        user.status = "inactive";
        await user.save();
      }
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  }
};

// This cron job runs every day at 12:00 AM
cron.schedule(
  "0 0 * * *",
  async () => {
    try {
      await removePendingFees();
      await updateUsersStatus();
      resetCountersAtMidnight();
    } catch (error) {
      console.error("Error in cron job:", error);
    }
  },
  {
    timezone: "Asia/Kolkata",
  }
);
