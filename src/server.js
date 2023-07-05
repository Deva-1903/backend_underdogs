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

const port = process.env.PORT;

const app = express();

//db connect
connectDB();

//middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

app.get("/", (req, res) => {
  res.status(200).send({ message: "Server is up..." });
});
app.use("/api", require("./routes/homeRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});

// This function updates the status of users based on their planEnds date
const updateStatus = async () => {
  const currentDate = new Date();

  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(currentDate.getDate() - 10);

  const pendingFeesToDelete = await PendingFees.find({
    paymentStatus: "paid",
    createdAt: { $lt: tenDaysAgo },
  });

  for (const pendingFee of pendingFeesToDelete) {
    await pendingFee.remove();
  }

  const users = await User.find({ status: "active" });

  for (const user of users) {
    const planEnds = new Date(user.planEnds);

    if (planEnds < currentDate) {
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
    resetCountersAtMidnight();
  },
  {
    timezone: "Asia/Kolkata",
  }
);
