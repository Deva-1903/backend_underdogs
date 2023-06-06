const path = require("path");
const express = require("express");
const cors = require("cors");
const colors = require("colors");
const dotenv = require("dotenv").config();
const cron = require("node-cron");

const connectDB = require("../config/db");

const { errorHandler } = require("../src/middleware/errorMiddleware");
const User = require("../model/userModel");

const port = process.env.PORT;

const app = express();

//db connect
connectDB();

//middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

app.use("/api", require("./routes/homeRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});

// This function updates the status of users based on their planEnds date
const updateStatus = async () => {
  const currentDate = new Date().toLocaleDateString("en-GB");
  const users = await User.find({ status: "active" });

  for (const user of users) {
    const planEnds = new Date(
      user.planEnds.replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$2/$1/$3")
    );

    if (planEnds.toLocaleDateString("en-GB") < currentDate) {
      user.status = "inactive";
      await user.save();
    }
  }
};

// This cron job runs every day at 12:00 AM
cron.schedule(
  "0 0 * * *",
  async () => {
    await updateStatus();
  },
  {
    timezone: "Asia/Kolkata", // Change this to your timezone
  }
);
