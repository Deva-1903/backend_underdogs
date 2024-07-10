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

// Attendace controllers
const getAttendancesByDate = asyncHandler(async (req, res) => {
  try {
    let branch = req.branch
    let query = {};
    const { date, status, session, page = 1, userId } = req.query;
    const limit = 9;

    if (userId) {
      query.user_id = userId;
    } else {
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
    }

    if (session === "morning" || session === "evening") {
      query.session = session;
    }

    query.branch = branch

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


// Admin related
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
      { password: 0, salt: 0 }
    );
    res.json(admins);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// Contact Form
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

const deleteContactForm = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await ContactForm.deleteOne({ _id: id });

  if (result.deletedCount === 0) {
    res.status(404);
    throw new Error("Contact form not found");
  }

  res.json({ message: "Contact form deleted successfully" });
});


// Price related
const getAllPrices = async (req, res) => {
  try {
    let branch = req.branch
    const prices = await Price.find({branch}).sort({ price: 1 });
    res.json(prices);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

const addPrice = async (req, res) => {
  try {
    let branch = req.branch
    const { price } = req.body;

    const newPrice = await Price.create({ price, branch });

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


// Fees related controllers
const getPendingFees = asyncHandler(async (req, res) => {
  const { page = 1, sort = "newest", status } = req.query;
  const perPage = 10;
  let branch = req.branch

  const sortOption = sort === "oldest" ? "createdAt" : "-createdAt";

  let filter = {};

  if (status === "pending" || status === "paid") {
    filter.paymentStatus = status;
  }

  filter.branch = branch

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
  const { amount, payment_mode, adminName } = req.body;
  let branch = req.branch

  try {
    let user = await User.findOne({ id, branch });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const pendingFee = await PendingFees.findOne({ userId: id, branch });

    if (!pendingFee) {
      return res.status(404).json({ error: "Pending fees not found" });
    }

    const { pendingAmount, paymentStatus } = pendingFee;

    if (amount == pendingAmount) {
      pendingFee.paymentStatus = "paid";
      pendingFee.pendingAmount = 0;

      await pendingFee.save();

      // Create fees details
      const feesDetailsData = {
        branch,
        user_id: user.id,
        user_name: user.name,
        subscription: user.subscription,
        subscription_type: user.subscription_type,
        cardio: user.cardio,
        mode_of_payment: payment_mode,
        admin: adminName,
        amount,
        transaction_type: "Pending fees",
        pending_amount: 0,
      };

      const createdFeesDetails = await FeesDetails.create(feesDetailsData);

      return res.status(200).json({
        message: "Payment completed successfully",
        pendingAmount: pendingFee.pendingAmount,
      });
    } else if (amount < pendingAmount) {
      pendingFee.pendingAmount -= amount;

      await pendingFee.save();

      // Create fees details
      const feesDetailsData = {
        branch,
        user_id: user.id,
        user_name: user.name,
        subscription: user.subscription,
        subscription_type: user.subscription_type,
        cardio: user.cardio,
        mode_of_payment: payment_mode,
        admin: adminName,
        amount,
        transaction_type: "Pending fees",
        pending_amount: pendingFee.pendingAmount,
      };

      const createdFeesDetails = await FeesDetails.create(feesDetailsData);

      return res.status(200).json({
        message: "Partial payment made successfully",
        pendingAmount: pendingFee.pendingAmount,
      });
    } else {
      return res.status(400).json({ error: "Invalid payment amount" });
    }
  } catch (error) {
    return next(error);
  }
});

const deleteFees = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deleted = await FeesDetails.findByIdAndDelete(id);

  if (!deleted) {
    return res.status(404).json({ error: "Fees detail not found." });
  }

  res.json({ message: "Fees detail deleted successfully." });
});


// Brochure
const getBrochureURL = asyncHandler(async (req, res) => {
  try {
    let branch = req.branch
    const brochure = await Brochure.find({branch});
    res.json(brochure);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch brochures." });
  }
});

const addBrochure = asyncHandler(async (req, res) => {
  const { photoURL } = req.body;
  let branch = req.branch

  try {
    const brochure = await Brochure.create({ photoURL, branch });
    res.status(201).json(brochure);
  } catch (error) {
    res.status(500).json({ error: "Failed to add brochure." });
  }
});

const updateBrochureURL = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { photoURL } = req.body;
  let branch = req.branch

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


// Cardio Types
const getAllCardioTypes = asyncHandler(async (req, res) => {
  let branch = req.branch
  const cardioTypes = await Cardio.find({ branch });
  res.json(cardioTypes);
});

const addCardioType = asyncHandler(async (req, res) => {
  const { name } = req.body;
  let branch = req.branch

  try {
    const cardioType = await Cardio.create({ name, branch });
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


module.exports = {
  getAttendancesByDate,
  getContactForms,
  getAllAdminNames,
  getAllAdmins,
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
  getPendingFees,
  updatePendingFees,
  deleteFees,
};
