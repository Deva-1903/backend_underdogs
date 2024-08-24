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
  Enquiry,
  TeamMember
} = require("../../model");

// Attendace controllers
const getAttendancesByDate = asyncHandler(async (req, res) => {
  try {
    let query = {};
    let { date, status, session, page = 1, userId, branch } = req.query;
    let limit = 9;

    if (!branch) {
      branch = req.headers['x-branch']
    }

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
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 15;
    const skip = (page - 1) * limit;

    const contactForms = await ContactForm.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalContactForms = await ContactForm.countDocuments();
    const totalPages = Math.ceil(totalContactForms / limit);

    res.json({
      data: contactForms,
      currentPage: page,
      totalPages: totalPages
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching contact forms', error: error.message });
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


// @desc    Add a new team member
// @route   POST /api/admin/team-members
// @access  Private (Admin only)
const manageTeamMember = asyncHandler(async (req, res) => {
  const { method, id, name, role, image, instaUrl, email, yearsOfExperience, specialization, certifications, bio, phoneNumber } = req.body;

  switch (method) {
    case 'POST':
      if (!name || !role || !image || !email || !yearsOfExperience) {
        res.status(400);
        throw new Error('Please provide all required fields');
      }

      const newTeamMember = await TeamMember.create({
        name,
        role,
        image,
        instaUrl,
        email,
        yearsOfExperience,
        specialization,
        certifications: certifications.split(',').map(cert => cert.trim()),
        bio,
        phoneNumber,
      });

      if (newTeamMember) {
        res.status(201).json(newTeamMember);
      } else {
        res.status(400);
        throw new Error('Invalid team member data');
      }
      break;

    case 'PUT':
      if (!id) {
        res.status(400);
        throw new Error('Please provide team member id');
      }

      // Remove undefined fields
      Object.keys(updateFields).forEach(key => updateFields[key] === undefined && delete updateFields[key]);

      // Handle certifications separately if present
      if (updateFields.certifications) {
        updateFields.certifications = updateFields.certifications.split(',').map(cert => cert.trim());
      }

      const updatedTeamMember = await TeamMember.findByIdAndUpdate(
        id,
        { $set: updateFields },
        { new: true }
      );

      if (updatedTeamMember) {
        res.json(updatedTeamMember);
      } else {
        res.status(404);
        throw new Error('Team member not found');
      }
      break;

    case 'DELETE':
      if (!id) {
        res.status(400);
        throw new Error('Please provide team member id');
      }

      const deletedTeamMember = await TeamMember.findByIdAndDelete(id);

      if (deletedTeamMember) {
        res.json({ message: 'Team member deleted successfully' });
      } else {
        res.status(404);
        throw new Error('Team member not found');
      }
      break;

    default:
      res.status(400);
      throw new Error('Invalid method');
  }
});

// @desc    Get all team members
// @route   GET /api/admin/team-members
// @access  Private (Admin only)
const getTeamMembers = asyncHandler(async (req, res) => {
  const teamMembers = await TeamMember.find({});
  res.json(teamMembers);
});

// Enquiry
const createEnquiry = asyncHandler(async (req, res) => {
  const { name, contactDetails, enquiryDate, notes } = req.body;
  let branch = req.branch
  const enquiry = await Enquiry.create({ name, contactDetails, enquiryDate, notes, branch });
  res.status(201).json(enquiry);
});

const getEnquiries = asyncHandler(async (req, res) => {
 try {
    let branch = req.branch
    const page = parseInt(req.query.page) || 1;
    const limit = 15;
    const skip = (page - 1) * limit;
    const sort = req.query.sort || 'newest';
    const status = req.query.status || 'all';

    let query = {};
    if (status !== 'all') {
      query.status = status;
    }

    let sortOption = {};
    if (sort === 'newest') {
      sortOption = { createdAt: -1 };
    } else if (sort === 'oldest') {
      sortOption = { createdAt: 1 };
    }

    query.branch = branch

    const enquiries = await Enquiry.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    const totalEnquiries = await Enquiry.countDocuments(query);
    const totalPages = Math.ceil(totalEnquiries / limit);

    res.json({
      data: enquiries,
      currentPage: page,
      totalPages: totalPages
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching enquiries', error: error.message });
  }
});

const updateEnquiryStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  let branch = req.branch
  const enquiry = await Enquiry.findOneAndUpdate(
    {_id: id, branch}, 
    { status }, 
    { new: true }
  );
  if (!enquiry) {
    res.status(404);
    throw new Error('Enquiry not found');
  }
  res.json(enquiry);
});

module.exports = {
  createEnquiry,
  getEnquiries,
  updateEnquiryStatus,
  manageTeamMember,
  getTeamMembers,
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
