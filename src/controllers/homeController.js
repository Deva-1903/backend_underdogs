const asyncHandler = require("express-async-handler");
const Attendance = require("../../model/attendaceModel");
const User = require("../../model/userModel");
const ContactForm = require("../../model/contactFormModel");
const Brochure = require("../../model/brochureModel");
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
    const currentDate = moment().tz("Asia/Kolkata");

    // Check if the user exists in the database
    const user = await User.findOne({ id });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentHour = currentDate.hours();

    console.log(currentHour);

    let session;
    if (currentHour >= 3 && currentHour <= 14) {
      session = "morning";
    } else if (currentHour >= 15 && currentHour <= 23) {
      session = "evening";
    } else {
      return res.status(400).json({
        message: "Attendance can only be added between 3am-2pm and 3pm-1am",
      });
    }

    const existingAttendance = await Attendance.findOne({
      user_id: user.id,
      session,
      $expr: {
        $and: [
          {
            $eq: [
              { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
              {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: currentDate.toDate(),
                },
              },
            ],
          },
        ],
      },
    });

    if (existingAttendance) {
      return res.status(400).json({
        message: `You have already entered attendance for the ${session} session`,
      });
    }

    // Create a new attendance object
    const timeIn = currentDate.format("h:mm:ss a");
    const attendance = new Attendance({
      user_id: user.id,
      user_name: user.name,
      timeIn,
      date: currentDate.toDate(),
      session,
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
      cardio: user.cardio,
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

module.exports = {
  addAttendance,

  getUserDetails,
  postContactForm,
  getBrochureURL,
};
