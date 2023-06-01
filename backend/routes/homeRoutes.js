const express = require("express");
const router = express.Router();
const {
  addAttendance,
  getTodaysAttendances,
  getUserDetails,
  postContactForm,
} = require("../controllers/homeController");

// User routes
router.route("/users").get(getUserDetails);

// Attendance routes
router.route("/attendance").get(getTodaysAttendances).post(addAttendance);

// Contact form route
router.route("/contact-form").post(postContactForm);

module.exports = router;
