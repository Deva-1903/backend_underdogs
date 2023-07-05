const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const moment = require("moment");
const jwt = require("jsonwebtoken");
const Admin = require("../../model/adminModel");
const Attendance = require("../../model/attendaceModel");
const FeesDetails = require("../../model/feesDetailsModel");
const SubscriptionOption = require("../../model/subscriptionOptionModel");
const SubscriptionType = require("../../model/subscriptionTypeModel");
const Cardio = require("../../model/cardioModel");
const User = require("../../model/userModel");
const PendingFees = require("../../model/pendingFeesModel");
const ContactForm = require("../../model/contactFormModel");
const Brochure = require("../../model/brochureModel");
const Price = require("../../model/priceModel");
const sgMail = require("@sendgrid/mail");
const fs = require("fs");
const multer = require("multer");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Create the multer upload middleware
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage }).single("attachment");

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
    occupation,
    feesAmount,
    registrationFees,
    adminName,
    isPending,
    pendingAmount,
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
    occupation,
    feesAmount,
    registrationFees,
    photoURL,
  });

  const amount = parseInt(feesAmount) + parseInt(registrationFees);

  const generateInvoiceID = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";

    let invoiceID = "#";

    for (let i = 0; i < 4; i++) {
      if (i % 2 === 0) {
        const randomCharIndex = Math.floor(Math.random() * characters.length);
        invoiceID += characters.charAt(randomCharIndex);
      } else {
        const randomNumIndex = Math.floor(Math.random() * numbers.length);
        invoiceID += numbers.charAt(randomNumIndex);
      }
    }

    return invoiceID;
  };

  const invoiceID = generateInvoiceID();

  const feesDetailsData = {
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

  if (isPending === "yes") {
    const pendingUser = await PendingFees.findOneAndUpdate(
      { userId: user.id },
      { $inc: { pendingAmount: parseInt(pendingAmount) } },
      { new: true }
    );

    if (!pendingUser) {
      await PendingFees.create({
        userId: user.id,
        userName: user.name,
        pendingAmount: parseInt(pendingAmount),
        paymentStatus: "pending",
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
    occupation: user.occupation,
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
    feesAmount,
    isPending,
    pendingAmount,
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
      feesAmount,
      status: "active",
    },
    { new: true }
  );

  if (!updatedUser) {
    res.status(404);
    throw new Error("User not found");
  }

  const generateInvoiceID = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";

    let invoiceID = "#";

    for (let i = 0; i < 4; i++) {
      if (i % 2 === 0) {
        const randomCharIndex = Math.floor(Math.random() * characters.length);
        invoiceID += characters.charAt(randomCharIndex);
      } else {
        const randomNumIndex = Math.floor(Math.random() * numbers.length);
        invoiceID += numbers.charAt(randomNumIndex);
      }
    }

    return invoiceID;
  };

  const invoiceID = generateInvoiceID();

  const feesDetailsData = {
    invoice_id: invoiceID,
    user_id: updatedUser.id,
    user_name: updatedUser.name,
    subscription: updatedUser.subscription,
    subscription_type: updatedUser.subscription_type,
    cardio: updatedUser.cardio,
    amount: updatedUser.feesAmount,
    mode_of_payment,
    admin: adminName,
    transaction_type: "Fees Renewal",
    pending_amount: pendingAmount || 0,
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

  if (isPending === "yes") {
    const pendingUser = await PendingFees.findOneAndUpdate(
      { userId: updatedUser.id },
      { $inc: { pendingAmount: parseInt(pendingAmount) } },
      { new: true }
    );

    if (!pendingUser) {
      await PendingFees.create({
        userId: updatedUser.id,
        userName: updatedUser.name,
        pendingAmount: parseInt(pendingAmount),
        paymentStatus: "pending",
      });
    }
  }

  res.json({
    id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email,
    mobile: updatedUser.mobile,
    mode_of_payment: updatedUser.mode_of_payment,
    subscription: updatedUser.subscription,
    subscription_type: updatedUser.subscription_type,
    cardio: updatedUser.cardio,
    planEnds: updatedUser.planEnds,
    status: updatedUser.status,
    invoice_id: feesDetailsData.invoice_id,
    planEnds: updatedUser.planEnds,
    transaction_type: feesDetailsData.transaction_type,
    feesAmount: updatedUser.feesAmount,
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
    occupation,
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
  if (occupation) updatedUser.occupation = occupation;

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
    occupation: user.occupation,
  });
});

const getAttendancesByDate = asyncHandler(async (req, res) => {
  try {
    let query = {};
    const { date, status, session, page = 1 } = req.query;
    const limit = 12;

    if (date) {
      const searchDate = moment.utc(date).utcOffset("+05:30").startOf("day");

      query.date = {
        $gte: searchDate.toDate(),
        $lt: searchDate.clone().add(1, "day").toDate(),
      };
    } else {
      const currentDate = moment().utcOffset("+05:30").startOf("day");

      query.date = {
        $gte: currentDate.toDate(),
        $lt: currentDate.clone().add(1, "day").toDate(),
      };
    }

    if (status === "active" || status === "inactive") {
      query.status = status;
    }

    if (session === "morning" || session === "evening") {
      query.session = session;
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

  // Validate that the input value is a positive number
  const number = parseInt(name);
  if (isNaN(number) || number <= 0) {
    return res.status(400).json({
      error: "Invalid subscription option. Please enter a positive number.",
    });
  }

  const optionName = `${name} ${name === "1" ? "month" : "months"}`;

  SubscriptionOption.create({ name: optionName })
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

const getAllPrices = async (req, res) => {
  try {
    const prices = await Price.find().sort({ price: 1 });
    res.json(prices);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

const addPrice = async (req, res) => {
  try {
    const { price } = req.body;

    const newPrice = await Price.create({ price });

    res.status(201).json(newPrice);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

const deletePrice = async (req, res) => {
  try {
    const { id } = req.params;

    await Price.findByIdAndRemove(id);

    res.json({ message: "Price deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

const sendInvoice = async (req, res) => {
  try {
    upload(req, res, async (err) => {
      if (err) {
        console.error("Error uploading file:", err);
        res.status(500).json({ message: "Failed to upload file." });
        return;
      }

      const { email, action, invoice_id, user_name } = req.body;
      const attachment = req.file;

      let subject = "";
      let text = "";

      if (action === "register") {
        subject = `Welcome to UnderDogs Fitness Club - Invoice ${invoice_id}`;
        text = `
Dear ${user_name},

Thank you for registering at UnderDogs Fitness Club! We are thrilled to have you as a new member. Attached is the invoice for your membership. If you have any questions or need assistance, please don't hesitate to reach out to our friendly team.

We look forward to seeing you at our gym soon!

Website: https://www.underdogsfitness.in/
Contact/WhatsApp: +91 91235 25358 / +91 63822 32050

Best regards,
UnderDogs Fitness Club      `;
      } else if (action === "updateSubscription") {
        subject = `UnderDogs Fitness Club Subscription Update - Invoice ${invoice_id}`;
        text = `
Dear ${user_name},

We are excited to inform you that your gym subscription at UnderDogs Fitness Club has been updated. Attached is the updated invoice reflecting the changes. If you have any questions regarding your subscription or need further assistance, please feel free to contact our team.

Thank you for choosing UnderDogs Fitness Club as your fitness partner!

Website: https://www.underdogsfitness.in/
Contact/WhatsApp: +91 91235 25358 / +91 63822 32050

Best regards,
UnderDogs Fitness Club
        `;
      } else {
        subject = `Invoice ${invoice_id}`;
        text = `
Dear ${user_name},

We hope this email finds you well. Please find attached the invoice for your recent transaction/action. If you require any clarification or have any concerns, don't hesitate to reach out to us. We appreciate your continued support.

Website: https://www.underdogsfitness.in/
Contact/WhatsApp: +91 91235 25358 / +91 63822 32050

Thank you,
UnderDogs Fitness Club
        `;
      }

      const attachmentData = await new Promise((resolve, reject) => {
        fs.readFile(attachment.path, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });

      const attachmentName = attachment.originalname;
      const attachmentType = attachment.mimetype;

      const message = {
        to: "devaags999@gmail.com",
        from: "underdogsfitnessclub@gmail.com",
        subject: subject,
        text: text,
        attachments: [
          {
            content: attachmentData.toString("base64"),
            filename: attachmentName,
            type: attachmentType,
            disposition: "attachment",
          },
        ],
      };

      try {
        await sgMail.send(message);
        res.json({ message: "Invoice sent successfully!" });

        // Delete the file from the uploads folder
        fs.unlink(attachment.path, (err) => {
          if (err) {
            console.error("Error deleting file:", err);
          }
        });
      } catch (error) {
        console.error("Error sending invoice:", error);
        res.status(500).json({ message: "Failed to send invoice." });
      }
    });
  } catch (error) {
    console.error('Error importing "formidable":', error);
    res.status(500).json({ message: "Failed to process the form data." });
  }
};

const getUserPendingFee = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  try {
    const pendingAmount = await PendingFees.findOne({ userId: userId })
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

const getPendingFees = asyncHandler(async (req, res) => {
  const { page = 1, sort = "newest", status } = req.query;
  const perPage = 10;

  const sortOption = sort === "oldest" ? "createdAt" : "-createdAt";

  let filter = {};

  if (status === "pending" || status === "paid") {
    filter.paymentStatus = status;
  }

  try {
    const pendingFees = await PendingFees.find(filter)
      .sort(sortOption)
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean();

    res.json(pendingFees);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const updatePendingFees = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { amount, mode_of_payment, adminName } = req.body;

  try {
    let user = await User.findOne({ id });

    if (!user) {
      return next(new Error("User not found"));
    }

    const pendingFee = await PendingFees.findOne({ userId: id });

    if (!pendingFee) {
      return next(new Error("Pending fees not found"));
    }

    const { pendingAmount, paymentStatus } = pendingFee;

    if (amount == pendingAmount) {
      pendingFee.paymentStatus = "paid";
      pendingFee.pendingAmount = 0;

      await pendingFee.save();

      // Create fees details
      const feesDetailsData = {
        user_id: user.id,
        user_name: user.name,
        subscription: user.subscription,
        subscription_type: user.subscription_type,
        cardio: user.cardio,
        mode_of_payment,
        admin: adminName,
        amount,
        transaction_type: "Pending fees",
        pending_amount: 0,
      };

      const createdFeesDetails = await FeesDetails.create(feesDetailsData);

      return res.json({
        message: "Payment completed successfully",
        pendingAmount: pendingFee.pendingAmount,
      });
    } else if (amount < pendingAmount) {
      pendingFee.pendingAmount -= amount;

      await pendingFee.save();

      // Create fees details
      const feesDetailsData = {
        user_id: user.id,
        user_name: user.name,
        subscription: user.subscription,
        subscription_type: user.subscription_type,
        cardio: user.cardio,
        mode_of_payment,
        admin: adminName,
        amount,
        transaction_type: "Pending fees",
        pending_amount: pendingFee.pendingAmount,
      };

      const createdFeesDetails = await FeesDetails.create(feesDetailsData);

      return res.json({
        message: "Partial payment made successfully",
        pendingAmount: pendingFee.pendingAmount,
      });
    } else {
      return next(new Error("Invalid payment amount"));
    }
  } catch (error) {
    return next(error);
  }
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
  getAllPrices,
  addPrice,
  deletePrice,
  sendInvoice,
  getUserPendingFee,
  getPendingFees,
  updatePendingFees,
};
