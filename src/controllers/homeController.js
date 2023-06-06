const asyncHandler = require("express-async-handler");
const Attendance = require("../../model/attendaceModel");
const User = require("../../model/userModel");
const ContactForm = require("../../model/contactFormModel");
const Brochure = require("../../model/brochureModel");

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

  res.json({
    id: user.id,
    name: user.name,
    subscription: user.subscription,
    subscription_type: user.subscription_type,
    status: user.status,
    planEnds: user.planEnds,
    cardio: user.cardio,
  });
});

const addAttendance = asyncHandler(async (req, res) => {
  try {
    const { id } = req.body;
    const currentDate = new Date();

    // Check if the user exists in the database
    const user = await User.findOne({ id });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the attendance for the user on the current date already exists
    const existingAttendance = await Attendance.findOne({
      user_id: user.id,
      date: currentDate.toLocaleDateString("en-GB"),
    });

    if (existingAttendance) {
      return res.status(204).json({
        message: "Attendance already added for this user on the current date",
      });
    }

    // Create a new attendance object
    const options = { hour12: true, hourCycle: "h12" };
    const timeIn = currentDate.toLocaleTimeString("en-GB", options);
    const attendance = new Attendance({
      user_id: user.id,
      user_name: user.name,
      timeIn,
      date: currentDate.toLocaleDateString("en-GB"),
      status: user.status,
      planEnds: user.planEnds,
      subscription: user.subscription,
      subscription_type: user.subscription_type,
    });

    // Save the attendance object to the database
    await attendance.save();

    // Return the user's details along with the attendance details
    res.json({
      user_id: user.id,
      user: user.name,
      timeIn,
      date: attendance.date,
      status: user.status,
      planEnds: user.planEnds,
      subscription: user.subscription,
      planEnds: user.planEnds,
      cardio: user.cardio,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const getTodaysAttendances = asyncHandler(async (req, res) => {
  try {
    // Get the date parameter from the request
    const currentDate = new Date().toLocaleDateString("en-GB");

    // Find all attendances for the given date
    const attendances = await Attendance.find({ date: currentDate });

    // Return the attendances for the given date
    res.json(attendances);
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

module.exports = {
  addAttendance,
  getTodaysAttendances,
  getUserDetails,
  postContactForm,
  getBrochureURL,
};
