const asyncHandler = require("express-async-handler");
const Attendance = require("../../model/attendaceModel");
const User = require("../../model/userModel");
const ContactForm = require("../../model/contactFormModel");
const Brochure = require("../../model/brochureModel");
const Counter = require("../../model/counterModel");
const PendingFees = require("../../model/pendingFeesModel");
const moment = require("moment-timezone");

const getUserDetails = asyncHandler(async (req, res) => {
  const id = req.query.id;
  const email = req.query.email;
  const mobile = req.query.mobile;

  let user;

  if (id) {
    user = await User.findOne({ id });
  } else if (email) {
    user = await User.findOne({ email });
  } else if (mobile) {
    user = await User.findOne({ mobile });
  } else {
    res.status(400);
    throw new Error("Please provide either an id, email, or mobile parameter");
  }

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  let pendingFees = 0;
  const pendingAmount = await PendingFees.findOne({ userId: user.id })
    .select("pendingAmount")
    .lean();

  if (!pendingAmount) {
    pendingFees = 0;
  } else {
    pendingFees = pendingAmount.pendingAmount;
  }

  res.json({
    id: user.id,
    name: user.name,
    subscription: user.subscription,
    subscription_type: user.subscription_type,
    status: user.status,
    planEnds: user.planEnds,
    cardio: user.cardio,
    photoURL: user.photoURL,
    pendingFees: pendingFees || 0,
  });
});

const addAttendance = asyncHandler(async (req, res) => {
  try {
    const { id } = req.body;
    const currentDate = moment().tz("Asia/Kolkata");

    const user = await User.findOne({ id });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentHour = currentDate.hours();

    let session;

    if (currentHour >= 4 && currentHour <= 13) {
      session = "morning";
    } else if (currentHour >= 15 && currentHour <= 23) {
      session = "evening";
    } else {
      return res.status(400).json({
        message: "Attendance can only be added between 4am-1pm and 3pm-11pm",
      });
    }

    const searchDate = moment().tz("Asia/Kolkata").startOf("day");
    const existingAttendance = await Attendance.findOne({
      user_id: user.id,
      session,
      date: {
        $gte: searchDate.toDate(),
        $lt: searchDate.clone().endOf("day").toDate(),
      },
    });

    if (existingAttendance) {
      return res.status(400).json({
        message: `You have already entered attendance for the ${session} session`,
      });
    }

    let counter = await Counter.findOne({ session });

    if (!counter) {
      counter = new Counter({ session });
    }

    const attendanceNumber = counter.count;

    // Increment the count
    counter.count++;

    // Save the updated counter
    await counter.save();

    let pendingFees = 0;
    const pendingAmount = await PendingFees.findOne({ userId: user.id })
      .select("pendingAmount")
      .lean();

    if (!pendingAmount) {
      pendingFees = 0;
    } else {
      pendingFees = pendingAmount.pendingAmount;
    }

    const timeIn = currentDate.format("h:mm:ss a");
    const attendance = new Attendance({
      number: attendanceNumber,
      user_id: user.id,
      user_name: user.name,
      photoURL: user.photoURL,
      timeIn,
      date: currentDate.toDate(),
      session,
      status: user.status,
      planEnds: user.planEnds,
      subscription: user.subscription,
      subscription_type: user.subscription_type,
      pendingAmount: pendingFees,
    });

    const savedAttendance = await attendance.save();

    res.json({
      number: savedAttendance.number,
      user_id: user.id,
      user: user.name,
      timeIn,
      date: savedAttendance.date,
      status: user.status,
      planEnds: user.planEnds,
      subscription: user.subscription,
      cardio: user.cardio,
      pendingAmount: pendingFees,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const postContactForm = asyncHandler(async (req, res) => {
  const { fullName, email, message } = req.body;

  if (!fullName || !email || !message) {
    res.status(400);
    throw new Error("Please provide a full name, email, and message");
  }

  const contactForm = new ContactForm({
    fullName,
    email,
    message,
  });

  const createdContactForm = await contactForm.save();

  res.status(201).json(createdContactForm);
});

const getBrochureURL = asyncHandler(async (req, res) => {
  try {
    const brochure = await Brochure.find({});
    res.json(brochure);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch brochures." });
  }
});

const resetCountersAtMidnight = async () => {
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

module.exports = {
  addAttendance,
  getUserDetails,
  postContactForm,
  getBrochureURL,
  resetCountersAtMidnight,
};
