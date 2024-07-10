const asyncHandler = require("express-async-handler");
const Attendance = require("../../model/attendanceModel");
const User = require("../../model/userModel");
const ContactForm = require("../../model/contactFormModel");
const Brochure = require("../../model/brochureModel");
const PendingFees = require("../../model/pendingFeesModel");
const moment = require("moment-timezone");

const getUserDetails = asyncHandler(async (req, res) => {
  const id = req.query.id;
  const email = req.query.email;
  const mobile = req.query.mobile;
  const branch = req.query.branch

  let user;

  if (id) {
    user = await User.findOne({ id, branch });
  } else if (email) {
    user = await User.findOne({ email, branch });
  } else if (mobile) {
    user = await User.findOne({ mobile, branch });
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
  const { id, branch } = req.body;
  const currentDate = moment().tz("Asia/Kolkata");
  const currentHour = currentDate.hours();

  if (!id || !branch) {
    return res.status(404).json({ message: "User not found" });
  }

  try {
    const user = await User.findOne({ id, branch });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

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
    const endDate = searchDate.clone().endOf("day");

    const existingAttendance = await Attendance.findOne({
      user_id: user.id,
      branch,
      session,
      date: { $gte: searchDate.toDate(), $lt: endDate.toDate() },
    });

    if (existingAttendance) {
      return res.status(400).json({
        message: `You have already entered attendance for the ${session} session`,
      });
    }

    // Find the latest attendance record for today's date
    const latestAttendance = await Attendance.findOne({
      branch,
      session,
      date: { $gte: searchDate.toDate(), $lt: endDate.toDate() },
    }).sort({ number: -1 });

    let number = 1; // Default number for a new attendance

    if (latestAttendance) {
      number = latestAttendance.number + 1;
    }

    const pendingAmount = await PendingFees.findOne({ userId: user.id, branch })
      .select("pendingAmount")
      .lean();

    const timeIn = currentDate.format("h:mm:ss a");

    const attendance = new Attendance({
      branch,
      number,
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
      pendingAmount: pendingAmount ? pendingAmount.pendingAmount : 0,
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
      pendingAmount: pendingAmount ? pendingAmount.pendingAmount : 0,
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
    const branch = req.query.branch
    const brochure = await Brochure.find({branch});
    res.json(brochure);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch brochures." });
  }
});

module.exports = {
  addAttendance,
  getUserDetails,
  postContactForm,
  getBrochureURL
};
