const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../../model/adminModel");
const Attendance = require("../../model/attendaceModel");
const FeesDetails = require("../../model/feesDetailsModel");
const SubscriptionOption = require("../../model/subscriptionOptionModel");
const SubscriptionType = require("../../model/subscriptionTypeModel");
const Cardio = require("../../model/cardioModel");
const User = require("../../model/userModel");
const ContactForm = require("../../model/contactFormModel");
const Brochure = require("../../model/brochureModel");

const registerAdmin = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400);
    throw new Error("Please add all fields");
  }

  // Check if user exists
  const existingAdmin = await Admin.findOne({ username });

  if (existingAdmin) {
    res.status(400);
    throw new Error("Admin already exists");
  }
  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user
  const createdAdmin = await Admin.create({
    username,
    password: hashedPassword,
    salt,
  });

  if (createdAdmin) {
    res.status(201).json({
      _id: createdAdmin._id,
      username: createdAdmin.username,
      token: generateToken(createdAdmin._id),
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

const loginAdmin = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const admin = await Admin.findOne({ username });

  if (admin && (await bcrypt.compare(password, admin.password))) {
    res.json({
      _id: admin._id,
      username: admin.username,
      token: generateToken(admin._id),
    });
  } else {
    res.status(400);
    throw new Error("Invalid credentials");
  }
});

const deleteAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find the admin by ID
  const admin = await Admin.findById(id);

  if (!admin) {
    res.status(404);
    throw new Error("Admin not found");
  }

  // Delete the admin from the database
  await admin.deleteOne();

  res.json({ message: "Admin deleted successfully" });
});

const registerUser = asyncHandler(async (req, res) => {
  const {
    name,
    age,
    gender,
    mobile,
    email,
    healthIssues,
    emergencyContactNo,
    height,
    weight,
    bloodGroup,
    address,
    subscription,
    subscription_type,
    mode_of_payment,
    cardio,
    photoURL,
    joiningDate,
    adminName,
  } = req.body;

  // Check if user with same email or phone number exists
  const userExists = await User.findOne({
    $or: [{ email }, { mobile }],
  });

  if (userExists) {
    res.status(400);
    throw new Error("User already exists with that email or phone number");
  }

  const user = await User.create({
    name,
    age,
    gender,
    mobile,
    email,
    healthIssues,
    emergencyContactNo,
    height,
    weight,
    bloodGroup,
    address,
    subscription,
    subscription_type,
    cardio,
    mode_of_payment,
    joiningDate,
    photoURL,
  });

  const feesDetailsData = {
    user_id: user.id,
    user_name: user.name,
    subscription,
    subscription_type,
    cardio,
    mode_of_payment,
    admin: adminName,
    transaction_type: "New User",
  };

  const createdFeesDetails = await FeesDetails.create(feesDetailsData);

  if (user) {
    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      subscription: user.subscription,
      subscription_type: user.subscription_type,
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

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
    age: user.age,
    gender: user.gender,
    mobile: user.mobile,
    email: user.email,
    healthIssues: user.healthIssues,
    emergencyContactNo: user.emergencyContactNo,
    height: user.height,
    weight: user.weight,
    bloodGroup: user.bloodGroup,
    address: user.address,
    subscription: user.subscription,
    subscription_type: user.subscription_type,
    cardio: user.cardio,
    status: user.status,
    joiningDate: user.joiningDate,
    planEnds: user.planEnds,
    photoURL: user.photoURL,
  });
});

const getAllUsers = asyncHandler(async (req, res) => {
  const { status, sort } = req.query;
  const page = parseInt(req.query.page) || 1;
  const pageSize = 9;
  const query = {};

  if (status === "active" || status === "inactive") {
    query.status = status;
  }

  let count = await User.countDocuments(query);
  let totalPages = Math.ceil(count / pageSize);

  let users;

  if (sort === "oldest") {
    users = await User.find(query)
      .sort({ createdAt: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize);
  } else {
    users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize);
  }

  res.json({
    users,
    page,
    totalPages,
    totalItems: count,
  });
});

const updateSubscription = asyncHandler(async (req, res) => {
  const id = req.query.id;
  const {
    subscription,
    subscription_type,
    cardio,
    mode_of_payment,
    paymentDate,
    adminName,
  } = req.body;

  if (!subscription) {
    res.status(400);
    throw new Error("Subscription is required");
  }

  const currentDate = paymentDate ? new Date(paymentDate) : new Date();

  let planEnds = currentDate;
  let duration;

  if (subscription.includes("year")) {
    duration = parseInt(subscription) * 12;
  } else if (subscription.includes("month")) {
    duration = parseInt(subscription);
  } else {
    res.status(400);
    throw new Error("Invalid subscription");
  }

  planEnds.setMonth(currentDate.getMonth() + duration);

  const updatedUser = await User.findOneAndUpdate(
    { id },
    {
      subscription,
      subscription_type,
      cardio,
      mode_of_payment,
      planEnds,
      status: "active",
    },
    { new: true }
  );

  if (!updatedUser) {
    res.status(404);
    throw new Error("User not found");
  }

  const feesDetailsData = {
    user_id: updatedUser.id,
    user_name: updatedUser.name,
    subscription: updatedUser.subscription,
    subscription_type: updatedUser.subscription_type,
    cardio: updatedUser.cardio,
    mode_of_payment,
    admin: adminName,
    transaction_type: "Fees Renewal",
  };

  const startOfCurrentDay = new Date();
  startOfCurrentDay.setHours(0, 0, 0, 0);

  const endOfCurrentDay = new Date();
  endOfCurrentDay.setHours(23, 59, 59, 999);

  const existingFeesDetails = await FeesDetails.findOneAndUpdate(
    {
      user_id: updatedUser.id,
      transaction_type: "Fees Renewal",
      createdAt: { $gte: startOfCurrentDay, $lte: endOfCurrentDay },
    },
    feesDetailsData,
    { upsert: true, new: true }
  );

  res.json({
    subscription: updatedUser.subscription,
    subscription_type: updatedUser.subscription_type,
    cardio: updatedUser.cardio,
    planEnds: updatedUser.planEnds,
    status: updatedUser.status,
  });
});

const updateUser = asyncHandler(async (req, res) => {
  const id = req.query.id;

  // Find the user to update
  let user = await User.findOne({ id });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Get the fields to update from the request body
  const {
    name,
    age,
    gender,
    mobile,
    email,
    healthIssues,
    emergencyContactNo,
    height,
    weight,
    bloodGroup,
    address,
    photoURL,
  } = req.body;

  // Create a new object with the existing user properties
  const updatedUser = {
    ...user.toObject(),
  };

  // Update the fields that have been provided in the request body
  if (name) updatedUser.name = name;
  if (age) updatedUser.age = age;
  if (gender) updatedUser.gender = gender;
  if (mobile) updatedUser.mobile = mobile;
  if (email) updatedUser.email = email;
  if (healthIssues) updatedUser.healthIssues = healthIssues;
  if (emergencyContactNo) updatedUser.emergencyContactNo = emergencyContactNo;
  if (height) updatedUser.height = height;
  if (weight) updatedUser.weight = weight;
  if (bloodGroup) updatedUser.bloodGroup = bloodGroup;
  if (address) updatedUser.address = address;
  if (photoURL) updatedUser.photoURL = photoURL;

  // Save the updated user object to the database
  user = await User.findOneAndUpdate({ id }, updatedUser, { new: true });

  // Send the updated user object in the response
  res.json({
    id: user.id,
    name: user.name,
    age: user.age,
    gender: user.gender,
    mobile: user.mobile,
    email: user.email,
    healthIssues: user.healthIssues,
    emergencyContactNo: user.emergencyContactNo,
    height: user.height,
    weight: user.weight,
    bloodGroup: user.bloodGroup,
    address: user.address,
    subscription: user.subscription,
    subscription_type: user.subscription_type,
    planEnds: user.planEnds,
    status: user.status,
    photoURL: user.photoURL,
  });
});

const getAttendancesByDate = asyncHandler(async (req, res) => {
  try {
    let query = {};
    const { date, status, page = 1 } = req.query;
    const limit = 12;

    if (date) {
      // Remove the time portion from the provided date string
      const searchDate = new Date(date).toISOString().split("T")[0];

      // Set the query to compare only the date portion
      query.date = {
        $gte: searchDate,
        $lt: new Date(new Date(searchDate).getTime() + 24 * 60 * 60 * 1000),
      };
    } else {
      const currentDate = new Date();
      query.date = {
        $gte: currentDate,
        $lt: new Date(currentDate.getTime() + 24 * 60 * 60 * 1000),
      };
    }

    if (status === "active" || status === "inactive") {
      query.status = status;
    }

    const startIndex = (page - 1) * limit;
    const attendances = await Attendance.find(query)
      .sort({ date: -1 })
      .limit(limit)
      .skip(startIndex);

    res.json(attendances);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const getFeesDetails = asyncHandler(async (req, res) => {
  try {
    let query = {};
    const { startDate, endDate, admin, page = 1 } = req.query;
    const limit = 12;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Set the time to start and end of the day for the given dates
      start.setUTCHours(0, 0, 0, 0);
      end.setUTCHours(23, 59, 59, 999);

      if (start.toDateString() === end.toDateString()) {
        query.createdAt = {
          $gte: start,
          $lte: end,
        };
      } else {
        query.createdAt = {
          $gte: start,
          $lt: end,
        };
      }
    }

    if (admin && admin !== "all") {
      query.admin = admin;
    }

    const startIndex = (page - 1) * limit;
    const feesDetails = await FeesDetails.find(query)
      .limit(limit)
      .skip(startIndex)
      .lean();

    res.json(feesDetails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const getContactForms = asyncHandler(async (req, res) => {
  const perPage = 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * perPage;

  const count = await ContactForm.countDocuments({});
  const totalPages = Math.ceil(count / perPage);

  const contactForms = await ContactForm.find({})
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(perPage);

  res.json(contactForms);
});

const getAllAdminNames = asyncHandler(async (req, res) => {
  try {
    const usernames = await Admin.distinct("username");
    res.json(usernames);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const getAllAdmins = asyncHandler(async (req, res) => {
  try {
    const admins = await Admin.find(
      { username: { $nin: ["bala", "karthik"] } },
      { password: 0 } // Exclude the "password" field
    );
    res.json(admins);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const getSubscriptionOptions = asyncHandler(async (req, res) => {
  const subscriptionOptions = await SubscriptionOption.find({});

  const sortedSubscriptionOptions = subscriptionOptions.sort((a, b) => {
    const valueA = parseInt(a.name);
    const valueB = parseInt(b.name);

    return valueA - valueB;
  });

  res.json(sortedSubscriptionOptions);
});

const addSubscriptionOption = asyncHandler(async (req, res) => {
  const { name } = req.body;

  // Validate the name format using a regular expression
  const regex = /^\d+\s+(month|months)$/;
  if (!regex.test(name)) {
    return res.status(400).json({
      error:
        "Invalid subscription option format. Please use the format: <number> month(s).",
    });
  }

  SubscriptionOption.create({ name })
    .then((newOption) => {
      res.status(201).json(newOption);
    })
    .catch((error) => {
      res.status(500).json({ error: "Failed to add subscription option." });
    });
});

const deleteSubscriptionOption = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deletedOption = await SubscriptionOption.findByIdAndDelete(id);

  if (!deletedOption) {
    return res.status(404).json({ error: "Subscription option not found." });
  }

  res.json({ message: "Subscription option deleted successfully." });
});

const getAllSubscriptionTypes = asyncHandler(async (req, res) => {
  const subscriptionTypes = await SubscriptionType.find({});
  res.json(subscriptionTypes);
});

const addSubscriptionType = asyncHandler(async (req, res) => {
  const { name } = req.body;

  try {
    const subscriptionType = await SubscriptionType.create({ name });
    res.status(201).json(subscriptionType);
  } catch (error) {
    res.status(500).json({ error: "Failed to add subscription type." });
  }
});

const deleteSubscriptionType = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const deletedSubscriptionType = await SubscriptionType.findByIdAndDelete(
      id
    );

    if (!deletedSubscriptionType) {
      return res.status(404).json({ error: "Subscription type not found." });
    }

    res.json({ message: "Subscription type deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete subscription type." });
  }
});

const getAllCardioTypes = asyncHandler(async (req, res) => {
  const cardioTypes = await Cardio.find({});
  res.json(cardioTypes);
});

const addCardioType = asyncHandler(async (req, res) => {
  const { name } = req.body;

  try {
    const cardioType = await Cardio.create({ name });
    res.status(201).json(cardioType);
  } catch (error) {
    res.status(500).json({ error: "Failed to add cardio type." });
  }
});

const deleteCardioType = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const deletedCardioType = await Cardio.findByIdAndDelete(id);

    if (!deletedCardioType) {
      return res.status(404).json({ error: "Cardio type not found." });
    }

    res.json({ message: "Cardio type deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete cardio type." });
  }
});

const getBrochureURL = asyncHandler(async (req, res) => {
  try {
    const brochure = await Brochure.find({});
    res.json(brochure);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch brochures." });
  }
});

const addBrochure = asyncHandler(async (req, res) => {
  const { photoURL } = req.body;

  try {
    const brochure = await Brochure.create({ photoURL });
    res.status(201).json(brochure);
  } catch (error) {
    res.status(500).json({ error: "Failed to add brochure." });
  }
});

const updateBrochureURL = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { photoURL } = req.body;

  try {
    const brochure = await Brochure.findById(id);
    if (!brochure) {
      return res.status(404).json({ error: "Brochure not found." });
    }

    brochure.photoURL = photoURL;
    await brochure.save();

    res.json(brochure);
  } catch (error) {
    res.status(500).json({ error: "Failed to update brochure URL." });
  }
});

const deleteContactForm = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await ContactForm.deleteOne({ _id: id });

  if (result.deletedCount === 0) {
    res.status(404);
    throw new Error("Contact form not found");
  }

  res.json({ message: "Contact form deleted successfully" });
});

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

module.exports = {
  loginAdmin,
  registerAdmin,
  deleteAdmin,
  registerUser,
  getUserDetails,
  updateSubscription,
  updateUser,
  getAllUsers,
  getAttendancesByDate,
  getContactForms,
  getFeesDetails,
  getAllAdminNames,
  getAllAdmins,
  getSubscriptionOptions,
  addSubscriptionOption,
  deleteSubscriptionOption,
  getAllSubscriptionTypes,
  addSubscriptionType,
  deleteSubscriptionType,
  getAllCardioTypes,
  addCardioType,
  deleteCardioType,
  getBrochureURL,
  updateBrochureURL,
  addBrochure,
  deleteContactForm,
};
