const request = require("supertest");
const app = require("../app");
const { connectDB, clearDB, closeDB, createTestAdmin, authHeaders } = require("./testSetup");
const User = require("../../model/userModel");
const Admin = require("../../model/adminModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

beforeAll(async () => await connectDB());
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe("Middleware - Branch Access Control", () => {
  describe("Branch access verification", () => {
    it("should allow access when admin's branch matches requested branch", async () => {
      const { token } = await createTestAdmin("branch1");

      const res = await request(app)
        .get("/api/admin/users")
        .set(authHeaders(token, "branch1"));

      expect(res.status).toBe(200);
    });

    it("should deny access when admin's branch does not match requested branch", async () => {
      const { token } = await createTestAdmin("branch1");

      const res = await request(app)
        .get("/api/admin/users")
        .set({
          Authorization: `Bearer ${token}`,
          "x-branch": "branch2", // Different branch
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("Access denied");
    });

    it("should use admin's branch when no branch header is provided", async () => {
      const { token } = await createTestAdmin("branch2");

      // Create a user in branch2
      await User.create({
        id: 1001,
        name: "Test User",
        gender: "Male",
        mobile: "9876543210",
        email: "test@example.com",
        subscription: "3 months",
        subscription_type: "Premium",
        cardio: "Treadmill",
        mode_of_payment: "Cash",
        branch: "branch2",
      });

      const res = await request(app)
        .get("/api/admin/users")
        .set({
          Authorization: `Bearer ${token}`,
          // No x-branch header
        });

      expect(res.status).toBe(200);
      // Should only return users from branch2
      expect(res.body.users).toBeDefined();
      expect(res.body.users.length).toBeGreaterThan(0);
      expect(res.body.users[0].branch).toBe("branch2");
    });

    it("should prevent branch1 admin from accessing branch2 data", async () => {
      const { token: branch1Token } = await createTestAdmin("branch1");
      
      // Create branch2 admin with different username
      const salt2 = await bcrypt.genSalt(10);
      const hashedPassword2 = await bcrypt.hash("testpass123", salt2);
      const branch2Admin = await Admin.create({
        username: "branch2admin",
        password: hashedPassword2,
        salt: salt2,
        branch: "branch2",
      });
      const branch2Token = jwt.sign({ id: branch2Admin._id }, process.env.JWT_SECRET, {
        expiresIn: "30d",
      });

      // Create users in both branches
      await User.create({
        id: 1001,
        name: "Branch1 User",
        gender: "Male",
        mobile: "9876543210",
        email: "branch1@example.com",
        subscription: "3 months",
        subscription_type: "Premium",
        cardio: "Treadmill",
        mode_of_payment: "Cash",
        branch: "branch1",
      });

      await User.create({
        id: 1001, // Same ID, different branch
        name: "Branch2 User",
        gender: "Female",
        mobile: "9876543211",
        email: "branch2@example.com",
        subscription: "3 months",
        subscription_type: "Premium",
        cardio: "Treadmill",
        mode_of_payment: "Cash",
        branch: "branch2",
      });

      // Branch1 admin should only see branch1 users
      const branch1Res = await request(app)
        .get("/api/admin/users")
        .set(authHeaders(branch1Token, "branch1"));

      expect(branch1Res.status).toBe(200);
      expect(branch1Res.body.users.length).toBe(1);
      expect(branch1Res.body.users[0].branch).toBe("branch1");
      expect(branch1Res.body.users[0].email).toBe("branch1@example.com");

      // Branch2 admin should only see branch2 users
      const branch2Res = await request(app)
        .get("/api/admin/users")
        .set(authHeaders(branch2Token, "branch2"));

      expect(branch2Res.status).toBe(200);
      expect(branch2Res.body.users.length).toBe(1);
      expect(branch2Res.body.users[0].branch).toBe("branch2");
      expect(branch2Res.body.users[0].email).toBe("branch2@example.com");
    });
  });

  describe("User registration with branch isolation", () => {
    it("should register user in admin's branch only", async () => {
      const { token } = await createTestAdmin("branch1");

      const userData = {
        name: "John Doe",
        age: 25,
        gender: "Male",
        mobile: "9876543210",
        email: "john@example.com",
        subscription: "3 months",
        subscription_type: "Premium",
        cardio: "Treadmill",
        mode_of_payment: "Cash",
        feesAmount: 3000,
        registrationFees: 500,
        adminName: "testadmin",
        isPending: "no",
        pendingAmount: 0,
      };

      const res = await request(app)
        .post("/api/admin/user/register")
        .set(authHeaders(token, "branch1"))
        .send(userData);

      expect(res.status).toBe(201);
      
      // Verify user was created in branch1
      const user = await User.findOne({ email: "john@example.com" });
      expect(user).toBeDefined();
      expect(user.branch).toBe("branch1");
    });

    it("should allow same email in different branches", async () => {
      const { token: branch1Token } = await createTestAdmin("branch1");
      const { token: branch2Token } = await createTestAdmin("branch2", "branch2admin");

      const userData = {
        name: "John Doe",
        age: 25,
        gender: "Male",
        mobile: "9876543210",
        email: "same@example.com", // Same email
        subscription: "3 months",
        subscription_type: "Premium",
        cardio: "Treadmill",
        mode_of_payment: "Cash",
        feesAmount: 3000,
        registrationFees: 500,
        adminName: "testadmin",
        isPending: "no",
        pendingAmount: 0,
      };

      // Register in branch1
      const res1 = await request(app)
        .post("/api/admin/user/register")
        .set(authHeaders(branch1Token, "branch1"))
        .send(userData);

      expect(res1.status).toBe(201);

      // Register same email in branch2 (should work)
      const res2 = await request(app)
        .post("/api/admin/user/register")
        .set(authHeaders(branch2Token, "branch2"))
        .send({ ...userData, mobile: "9876543211" }); // Different mobile

      expect(res2.status).toBe(201);

      // Verify both users exist in different branches
      const branch1User = await User.findOne({ email: "same@example.com", branch: "branch1" });
      const branch2User = await User.findOne({ email: "same@example.com", branch: "branch2" });

      expect(branch1User).toBeDefined();
      expect(branch2User).toBeDefined();
      expect(branch1User.branch).toBe("branch1");
      expect(branch2User.branch).toBe("branch2");
    });
  });

  describe("User retrieval with branch filtering", () => {
    it("should only return users from admin's branch", async () => {
      const { token } = await createTestAdmin("branch1");

      // Create users in both branches
      await User.create({
        id: 1001,
        name: "Branch1 User",
        gender: "Male",
        mobile: "9876543210",
        email: "branch1@example.com",
        subscription: "3 months",
        subscription_type: "Premium",
        cardio: "Treadmill",
        mode_of_payment: "Cash",
        branch: "branch1",
      });

      await User.create({
        id: 1002,
        name: "Branch2 User",
        gender: "Female",
        mobile: "9876543211",
        email: "branch2@example.com",
        subscription: "3 months",
        subscription_type: "Premium",
        cardio: "Treadmill",
        mode_of_payment: "Cash",
        branch: "branch2",
      });

      const res = await request(app)
        .get("/api/admin/users")
        .set(authHeaders(token, "branch1"));

      expect(res.status).toBe(200);
      expect(res.body.users.length).toBe(1);
      expect(res.body.users[0].branch).toBe("branch1");
      expect(res.body.users[0].email).toBe("branch1@example.com");
    });
  });
});
