/**
 * Jest setup file
 * Runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.SENDGRID_API_KEY = "SG.test-api-key-for-testing";
process.env.SENDER_EMAIL = "test@underdogsfitness.in";
process.env.MONGO_URI = "mongodb://localhost:27017/underdogs_test";
process.env.JWT_SECRET = "test-jwt-secret-key";
process.env.PORT = "5002";

// Increase test timeout for E2E tests (mongodb-memory-server needs time)
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  // Mock user data
  mockUser: {
    id: 1,
    name: "Test User",
    email: "test@example.com",
    mobile: "1234567890",
    subscription: "Monthly",
    subscription_type: "Premium",
    cardio: "Yes",
    mode_of_payment: "Cash",
    registrationFees: 500,
    feesAmount: 2000,
    transaction_type: "New User",
    planEnds: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    invoice_id: "#TEST123",
    pending_amount: 0,
    branch: "branch1",
  },

  // Mock admin data
  mockAdmin: {
    _id: "507f1f77bcf86cd799439011",
    username: "testadmin",
    branch: "branch1",
  },
};

// Console suppressions for cleaner test output
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

// Suppress specific console messages during tests
global.beforeEach(() => {
  console.error = jest.fn((...args) => {
    const message = args[0]?.toString() || "";
    // Only suppress expected test errors
    if (!message.includes("SendGrid Error") && !message.includes("Error uploading")) {
      originalConsoleError(...args);
    }
  });
});

global.afterEach(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});
