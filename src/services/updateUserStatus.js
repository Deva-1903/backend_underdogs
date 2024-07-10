// Function to update user status
const User = require("../../model/userModel");

exports.updateUsersStatus = async () => {
  try {
    const currentDate = new Date();

    // Update all users with status "active" whose planEnds date is in the past
    const result = await User.updateMany(
      { status: "active", planEnds: { $lt: currentDate } },
      { $set: { status: "inactive" } }
    );

    console.log(`Matched ${result.matchedCount} users and updated ${result.modifiedCount} users.`);
  } catch (error) {
    console.error("Error updating user statuses:", error);
  }
};


// exports.updateUsersStatus = async () => {
//   const currentDate = new Date();

//   const users = await User.find({ status: "active" });

//   for (const user of users) {
//     try {
//       const planEnds = new Date(user.planEnds);

//       if (planEnds < currentDate) {
//         user.status = "inactive";
//         await user.save();
//       }
//     } catch (error) {
//       console.error("Error updating user status:", error);
//     }
//   }
// };
