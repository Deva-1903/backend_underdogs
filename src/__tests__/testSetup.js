const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../../model/adminModel");

let mongoServer;

/**
 * Connect to in-memory MongoDB before tests
 */
const connectDB = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
};

/**
 * Drop all collections after each test
 */
const clearDB = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

/**
 * Close connection and stop server after all tests
 */
const closeDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
};

/**
 * Create a test admin and return the token + admin data
 */
const createTestAdmin = async (branch = "branch1") => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash("testpass123", salt);

  const admin = await Admin.create({
    username: "testadmin",
    password: hashedPassword,
    salt,
    branch,
  });

  const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

  return { admin, token };
};

/**
 * Get auth headers for a given token and branch
 */
const authHeaders = (token, branch = "branch1") => ({
  Authorization: `Bearer ${token}`,
  "x-branch": branch,
});

module.exports = {
  connectDB,
  clearDB,
  closeDB,
  createTestAdmin,
  authHeaders,
};
