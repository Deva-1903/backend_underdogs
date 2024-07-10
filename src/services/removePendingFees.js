const PendingFees = require("../../model/pendingFeesModel");

// Function to remove pending fees
exports.removePendingFees = async () => {
  const currentDate = new Date();
  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(currentDate.getDate() - 10);

  try {
    const result = await PendingFees.deleteMany({
      paymentStatus: "paid",
      createdAt: { $lt: tenDaysAgo },
    });

    console.log(`Successfully removed ${result.deletedCount} pending fees.`);
  } catch (error) {
    console.error("Error removing pending fees:", error);
  }
};
