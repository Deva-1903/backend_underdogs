const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline);

    // Return the db object from the connection
    return conn.connection.db;
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

module.exports = connectDB;
