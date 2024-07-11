const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../../model/adminModel");

const registerAdmin = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  let branchToAdd = req.branch

  if (!username || !password || !branchToAdd) {
    res.status(400);
    throw new Error("Please add all fields and ensure 'branch' is provided");
  }

  // Check if admin exists
  let admin = await Admin.findOne({ username, branch: branchToAdd });

  if (admin) {
      res.status(400);
      throw new Error("Admin already exists with this branch");
  } else {
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new admin with the provided branch
    admin = await Admin.create({
      username,
      password: hashedPassword,
      branch: branchToAdd,
      salt,
    });
  }

  // Respond with the created or updated admin data
  res.status(201).json({
    _id: admin._id,
    username: admin.username,
    branch: admin.branch,
    token: generateToken(admin._id),
  });
});

const loginAdmin = asyncHandler(async (req, res) => {
  const { username, password, branch } = req.body;

  // Find admin by username and ensure they have access to the provided branch
  const admin = await Admin.findOne({ username, branch });

  if (!admin) {
    res.status(403);
    throw new Error("Invalid credentials");
  }

  if (admin && (await bcrypt.compare(password, admin.password))) {
    // Password matches, generate token and respond with admin details
    res.json({
      _id: admin._id,
      username: admin.username,
      branch: admin.branch,
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
}