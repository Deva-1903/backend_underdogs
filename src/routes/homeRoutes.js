const express = require("express");
const router = express.Router();
const {
  addAttendance,
  getTodaysAttendances,
  getUserDetails,
  postContactForm,
  getBrochureURL,
} = require("../controllers/homeController");

// User routes
router.route("/users").get(getUserDetails);

// Attendance routes
router.route("/attendance").get(getTodaysAttendances).post(addAttendance);

// Contact form route
router.route("/contact-form").post(postContactForm);

router.route("/brochure").get(getBrochureURL);

module.exports = router;
