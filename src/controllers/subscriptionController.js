const asyncHandler = require("express-async-handler");
const { generateInvoiceID } = require("../services/helpers")
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

exports.updateSubscription = asyncHandler(async (req, res) => {
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
    adminName
  } = req.body;

  let branch = req.branch

  if (!subscription) {
    res.status(400);
    throw new Error("Subscription is required");
  }

  const currentDate = paymentDate ? new Date(paymentDate) : new Date();
  let duration;

  if (subscription.includes("year")) {
    duration = parseInt(subscription) * 12;
  } else if (subscription.includes("month")) {
    duration = parseInt(subscription);
  } else {
    res.status(400);
    throw new Error("Invalid subscription");
  }
  
  let planEnds = currentDate;
  planEnds.setMonth(currentDate.getMonth() + duration);

  const updatedUser = await User.findOneAndUpdate(
    { id, branch },
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

  const invoiceID = generateInvoiceID();

  const feesDetailsData = {
    branch,
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

  await FeesDetails.findOneAndUpdate(
    {
      user_id: updatedUser.id,
      branch,
      transaction_type: "Fees Renewal",
      createdAt: { $gte: startOfCurrentDay, $lte: endOfCurrentDay },
    },
    feesDetailsData,
    { upsert: true, new: true }
  );

  if (isPending === "yes") {
    const pendingUser = await PendingFees.findOneAndUpdate(
      { userId: updatedUser.id, branch },
      { $inc: { pendingAmount: parseInt(pendingAmount) } },
      { new: true }
    );

    if (!pendingUser) {
      await PendingFees.create({
        branch,
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
    pending_amount: pendingAmount || 0,
  });
});

exports.getFeesDetails = asyncHandler(async (req, res) => {
  try {
    let query = {};
    const { startDate, endDate, admin, page = 1, userId } = req.query;
    let branch = req.branch
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

    if (userId) {
      query.user_id = userId;
    }

    query.branch = branch

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

exports.getSubscriptionOptions = asyncHandler(async (req, res) => {
  let branch = req.branch
  const subscriptionOptions = await SubscriptionOption.find({ branch });

  const sortedSubscriptionOptions = subscriptionOptions.sort((a, b) => {
    const valueA = parseInt(a.name);
    const valueB = parseInt(b.name);

    return valueA - valueB;
  });

  res.json(sortedSubscriptionOptions);
});

exports.addSubscriptionOption = asyncHandler(async (req, res) => {
  let branch = req.branch
  const { name } = req.body;

  // Validate that the input value is a positive number
  const number = parseInt(name);
  if (isNaN(number) || number <= 0) {
    return res.status(400).json({
      error: "Invalid subscription option. Please enter a positive number.",
    });
  }

  const optionName = `${name} ${name === "1" ? "month" : "months"}`;

  SubscriptionOption.create({ name: optionName, branch })
    .then((newOption) => {
      res.status(201).json(newOption);
    })
    .catch((error) => {
      console.log(error)
      res.status(500).json({ error: "Failed to add subscription option." });
    });
});

exports.deleteSubscriptionOption = asyncHandler(async (req, res) => {
  let branch = req.branch
  const { id } = req.params;

  const deletedOption = await SubscriptionOption.findByIdAndDelete(id);

  if (!deletedOption) {
    return res.status(404).json({ error: "Subscription option not found." });
  }

  res.json({ message: "Subscription option deleted successfully." });
});

exports.getAllSubscriptionTypes = asyncHandler(async (req, res) => {
  let branch = req.branch
  const subscriptionTypes = await SubscriptionType.find({ branch });
  res.json(subscriptionTypes);
});

exports.addSubscriptionType = asyncHandler(async (req, res) => {
  let branch = req.branch
  const { name } = req.body;

  try {
    const subscriptionType = await SubscriptionType.create({ name, branch });
    res.status(201).json(subscriptionType);
  } catch (error) {
    res.status(500).json({ error: "Failed to add subscription type." });
  }
});

exports.deleteSubscriptionType = asyncHandler(async (req, res) => {
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