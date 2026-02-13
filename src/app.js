const express = require("express");
const cors = require("cors");
const { errorHandler } = require("./middleware/errorMiddleware");

const app = express();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// Routes
app.get("/", (req, res) => {
  res.status(200).send({ message: "Server is up..." });
});
app.use("/api", require("./routes/homeRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

// Error handler middleware
app.use(errorHandler);

module.exports = app;
