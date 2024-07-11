const { generateInvoiceID } = require("../services/helpers")
const asyncHandler = require("express-async-handler");
const moment = require("moment");
const {
  Admin,
  Attendance,
  FeesDetails,
  SubscriptionOption,
  SubscriptionType,
  Cardio,
  User,
  PendingFees,
  ContactForm,
  Brochure,
  Price,
} = require("../../model");

exports.registerUser = asyncHandler(async (req, res) => {
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
    occupation,
    feesAmount,
    registrationFees,
    adminName,
    isPending,
    pendingAmount,
  } = req.body;

  let branch = req.branch

  // Check if user with the same email or phone number exists in the branch
  const userExists = await User.findOne({
    $or: [{ email }, { mobile }],
    branch: branch
  });

  if (userExists) {
    res.status(400);
    throw new Error("User already exists with that email or phone number");
  }

  // Calculate the subscription end date
  const currentDate = joiningDate ? new Date(joiningDate) : new Date();
  let duration;

  if (subscription.includes("year")) {
    duration = parseInt(subscription) * 12;
  } else if (subscription.includes("month")) {
    duration = parseInt(subscription);
  } else {
    throw new Error("Invalid subscription");
  }

  currentDate.setMonth(currentDate.getMonth() + duration);
  const planEnds = currentDate;

  // Find the user with the highest ID and set the new user's ID to be one greater
  const highestUser = await User.findOne({ branch }).sort({ id: -1});
  const newUserId = highestUser ? highestUser.id + 1 : 1001;

  // Create user
  const user = await User.create({
    id: newUserId,
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
    occupation,
    feesAmount,
    registrationFees,
    photoURL,
    planEnds,
    branch
  });

  // Calculate total amount
  const amount = parseInt(feesAmount) + parseInt(registrationFees);

  // Generate invoice ID
  const invoiceID = generateInvoiceID();

  // Create fees details
  const feesDetailsData = {
    branch,
    invoice_id: invoiceID,
    user_id: user.id,
    user_name: user.name,
    subscription,
    subscription_type,
    cardio,
    mode_of_payment,
    admin: adminName,
    amount,
    transaction_type: "New User",
    pending_amount: pendingAmount || 0,
  };

  const createdFeesDetails = await FeesDetails.create(feesDetailsData);

  // Update pending fees if necessary
  if (isPending === "yes") {
    const pendingUser = await PendingFees.findOneAndUpdate(
      { userId: user.id, branch },
      { $inc: { pendingAmount: parseInt(pendingAmount) } },
      { new: true }
    );

    if (!pendingUser) {
      await PendingFees.create({
        userId: user.id,
        userName: user.name,
        pendingAmount: parseInt(pendingAmount),
        paymentStatus: "pending",
        branch
      });
    }
  }

  if (user) {
    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      subscription: user.subscription,
      subscription_type: user.subscription_type,
      cardio: user.cardio,
      mode_of_payment: user.mode_of_payment,
      registrationFees: user.registrationFees,
      feesAmount: user.feesAmount,
      transaction_type: feesDetailsData.transaction_type,
      planEnds: user.planEnds,
      invoice_id: feesDetailsData.invoice_id,
      pending_amount: pendingAmount || 0,
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

exports.getUserDetails = asyncHandler(async (req, res) => {
  const id = req.query.id;
  const email = req.query.email;
  const mobile = req.query.mobile;
  const branch = req.branch

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
  const pendingAmount = await PendingFees.findOne({ userId: user.id, branch })
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
    pendingFees: pendingFees || 0,
    occupation: user.occupation,
  });
});

exports.getAllUsers = asyncHandler(async (req, res) => {
  const { status, sort } = req.query;
  let branch = req.branch
  const page = parseInt(req.query.page) || 1;
  const pageSize = 9;
  const query = {};

  query.branch = branch

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

exports.updateUser = asyncHandler(async (req, res) => {
  const id = req.query.id;
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
    occupation,
  } = req.body;
  let branch = req.branch
  // Find the user to update
  let user = await User.findOne({ id, branch });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

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
  if (occupation) updatedUser.occupation = occupation;

  // Save the updated user object to the database
  user = await User.findOneAndUpdate({ id, branch }, updatedUser, { new: true });

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
    occupation: user.occupation,
  });
});

exports.getUserPendingFee = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const branch = req.branch

  try {
    const pendingAmount = await PendingFees.findOne({ userId: userId, branch })
      .select("pendingAmount")
      .lean();

    if (!pendingAmount) {
      return res.json({ pendingAmount: 0 });
    }

    res.json({ pendingAmount: pendingAmount.pendingAmount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

exports.getTotalFeesAmount = asyncHandler(async (req, res) => {
  try {
    let query = {};
    const { startDate, endDate, userId } = req.query;
    const branch = req.branch

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "startDate and endDate are required" });
    }

    const start = moment
      .utc(startDate)
      .utcOffset("+05:30")
      .startOf("day")
      .toDate();
    const end = moment.utc(endDate).utcOffset("+05:30").endOf("day").toDate();

    query.createdAt = {
      $gte: start,
      $lte: end,
    };

    if (userId) {
      const id = parseInt(userId);
      query.user_id = id;
    }

    query.branch = branch

    const feesDetails = await FeesDetails.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmountAdded: { $sum: "$amount" },
        },
      },
    ]);

    const totalAmount =
      feesDetails.length > 0 ? feesDetails[0].totalAmountAdded : 0;

    res.json({ totalAmount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});