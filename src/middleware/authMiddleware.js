const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const Admin = require("../../model/adminModel");

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      //Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      //get admin from the token
      req.admin = await Admin.findById(decoded.id).select("-password");
      
      if (!req.admin) {
        res.status(401);
        throw new Error("Admin not found");
      }

      // Get branch from header
      const requestedBranch = req.headers['x-branch'];
      
      // Always use admin's branch to ensure they can only access their own branch data
      // If a branch is requested in header, verify it matches admin's branch
      if (requestedBranch && req.admin.branch !== requestedBranch) {
        const error = new Error("Access denied: You do not have permission to access this branch");
        error.statusCode = 403;
        res.status(403);
        throw error;
      }

      // Set branch to admin's branch (ensures admin can only access their own branch)
      req.branch = req.admin.branch;

      next();
    } catch (error) {
      console.log(error);
      // Preserve status code if it was already set (e.g., 403 for branch access)
      // Otherwise default to 401
      if (!res.statusCode || res.statusCode === 200) {
        res.status(error.statusCode || 401);
      }
      throw error;
    }
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token");
  }
});

module.exports = { protect };
