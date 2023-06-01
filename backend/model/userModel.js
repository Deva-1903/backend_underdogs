const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
  {
    id: {
      type: Number,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    photoURL: {
      type: String,
    },
    age: {
      type: Number,
    },
    gender: {
      type: String,
      required: true,
    },
    mobile: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    healthIssues: {
      type: String,
    },
    emergencyContactNo: {
      type: String,
    },
    height: {
      type: String,
    },
    weight: {
      type: String,
    },
    bloodGroup: {
      type: String,
    },
    address: {
      type: String,
    },
    subscription: {
      type: String,
      required: true,
    },
    subscription_type: {
      type: String,
      required: true,
    },
    cardio: {
      type: String,
      required: true,
    },
    mode_of_payment: {
      type: String,
      required: true,
    },

    planEnds: {
      type: String,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

// Before saving the user, calculate the subscription end date
userSchema.pre("save", async function (next) {
  if (this.isNew) {
    const subscription = this.subscription;
    const currentDate = new Date();

    let duration;
    if (subscription.includes("year")) {
      duration = parseInt(subscription) * 12;
    } else if (subscription.includes("month")) {
      duration = parseInt(subscription);
    } else {
      next(new Error("Invalid subscription"));
    }

    currentDate.setMonth(currentDate.getMonth() + duration);
    const formattedDate = currentDate.toLocaleDateString("en-GB");

    this.planEnds = formattedDate;

    // Find the user with the highest ID
    const highestUser = await this.constructor.findOne().sort("-id");

    // Set the new user's ID to be one greater than the highest ID found
    this.id = highestUser ? highestUser.id + 1 : 1001;
  }

  next();
});

module.exports = mongoose.model("User", userSchema);
