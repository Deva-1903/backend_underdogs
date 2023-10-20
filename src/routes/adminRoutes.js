const express = require("express");
const router = express.Router();
const {
  loginAdmin,
  registerUser,
  getUserDetails,
  updateSubscription,
  updateUser,
  getAllUsers,
  getAttendancesByDate,
  getContactForms,
  getFeesDetails,
  getTotalFeesAmount,
  getAllAdminNames,
  registerAdmin,
  deleteAdmin,
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
  deleteFees,
} = require("../controllers/adminController");

const { protect } = require("../middleware/authMiddleware");

//Public Route
router.route("/login").post(loginAdmin);

//Private Route

// User routes
router.route("/users").get(protect, getAllUsers);
router.route("/user/register").post(protect, registerUser);
router.route("/user").get(protect, getUserDetails).put(protect, updateUser);
router.route("/user/subscription").put(protect, updateSubscription);

// Admin routes
router.route("/").post(protect, registerAdmin);
router.route("/:id").delete(protect, deleteAdmin);

// Attendance routes
router.route("/attendance").get(protect, getAttendancesByDate);

// Fees details route
router.route("/fees-details").get(protect, getFeesDetails);

router.route("/total-fees").get(protect, getTotalFeesAmount);

// Contact forms route
router.route("/contact-forms").get(protect, getContactForms);

// Admin names route
router.route("/admin-names").get(protect, getAllAdminNames);

router.route("/get-all").get(protect, getAllAdmins);

//add or delete subscription
router
  .route("/subscription-options")
  .get(protect, getSubscriptionOptions)
  .post(protect, addSubscriptionOption);

router
  .route("/subscription-options/:id")
  .delete(protect, deleteSubscriptionOption);

router
  .route("/subscription-types")
  .get(protect, getAllSubscriptionTypes)
  .post(protect, addSubscriptionType);

router.route("/subscription-types/:id").delete(protect, deleteSubscriptionType);

router
  .route("/cardio-types")
  .get(protect, getAllCardioTypes)
  .post(protect, addCardioType);

router.route("/cardio-types/:id").delete(protect, deleteCardioType);

router
  .route("/brochure")
  .get(protect, getBrochureURL)
  .post(protect, addBrochure);

router.route("/brochure/:id").put(protect, updateBrochureURL);

router.route("/contact-form/:id").delete(protect, deleteContactForm);

router.route("/prices").get(protect, getAllPrices).post(protect, addPrice);

router.delete("/prices/:id", deletePrice);

router.delete("/fees/:id", deleteFees);

router.route("/send-invoice").post(protect, sendInvoice);

router.route("/pending-fees").get(protect, getPendingFees);

router
  .route("/pending-fees/:id")
  .get(protect, getUserPendingFee)
  .put(protect, updatePendingFees);

module.exports = router;
