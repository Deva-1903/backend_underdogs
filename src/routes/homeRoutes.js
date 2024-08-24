const express = require("express");
const router = express.Router();
const {
  addAttendance,
  getUserDetails,
  postContactForm,
  getBrochureURL,
} = require("../controllers/homeController");
const {
  getTeamMembers,
} = require("../controllers/adminController");

// User routes
router.route("/users/public").get(getUserDetails);

// Attendance routes
router.route("/attendance").post(addAttendance);

// Contact form route
router.route("/contact-form").post(postContactForm);

router.route("/brochure").get(getBrochureURL);

router.route("/team-members").get(getTeamMembers);

module.exports = router;
