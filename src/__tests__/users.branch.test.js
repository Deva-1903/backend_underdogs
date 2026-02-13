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

const sampleUser = {
  name: "John Doe",
  age: 25,
  gender: "Male",
  mobile: "9876543210",
  email: "john@example.com",
  healthIssues: "None",
  emergencyContactNo: "9876543211",
  height: "175",
  weight: "70",
  bloodGroup: "O+",
  address: "123 Test Street",
  subscription: "3 months",
  subscription_type: "Premium",
  cardio: "Treadmill",
  mode_of_payment: "Cash",
  joiningDate: new Date().toISOString(),
  occupation: "Engineer",
  feesAmount: 3000,
  registrationFees: 500,
  adminName: "testadmin",
  isPending: "no",
  pendingAmount: 0,
};

describe("Users - Branch Isolation", () => {
  describe("User registration with branch isolation", () => {
    it("should register user in admin's branch automatically", async () => {
      const { token } = await createTestAdmin("branch1");

      const res = await request(app)
        .post("/api/admin/user/register")
        .set(authHeaders(token, "branch1"))
        .send(sampleUser);

      expect(res.status).toBe(201);
      
      const user = await User.findOne({ email: "john@example.com" });
      expect(user.branch).toBe("branch1");
    });

    it("should prevent duplicate users within same branch", async () => {
      const { token } = await createTestAdmin("branch1");

      await request(app)
        .post("/api/admin/user/register")
        .set(authHeaders(token, "branch1"))
        .send(sampleUser);

      const res = await request(app)
        .post("/api/admin/user/register")
        .set(authHeaders(token, "branch1"))
        .send(sampleUser);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("already exists");
    });

    it("should allow same user data in different branches", async () => {
      const { token: branch1Token } = await createTestAdmin("branch1");
      
      // Create branch2 admin
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

      // Register in branch1
      const res1 = await request(app)
        .post("/api/admin/user/register")
        .set(authHeaders(branch1Token, "branch1"))
        .send(sampleUser);

      expect(res1.status).toBe(201);

      // Register same email in branch2 with different mobile
      const res2 = await request(app)
        .post("/api/admin/user/register")
        .set(authHeaders(branch2Token, "branch2"))
        .send({
          ...sampleUser,
          mobile: "9876543212",
        });

      expect(res2.status).toBe(201);

      // Verify both exist
      const branch1User = await User.findOne({ email: "john@example.com", branch: "branch1" });
      const branch2User = await User.findOne({ email: "john@example.com", branch: "branch2" });

      expect(branch1User).toBeDefined();
      expect(branch2User).toBeDefined();
    });
  });

  describe("Get all users with branch filtering", () => {
    beforeEach(async () => {
      // Create users in both branches
      await User.create({
        id: 1001,
        name: "Branch1 User 1",
        gender: "Male",
        mobile: "9876543210",
        email: "branch1user1@example.com",
        subscription: "3 months",
        subscription_type: "Premium",
        cardio: "Treadmill",
        mode_of_payment: "Cash",
        branch: "branch1",
        status: "active",
      });

      await User.create({
        id: 1002,
        name: "Branch1 User 2",
        gender: "Female",
        mobile: "9876543211",
        email: "branch1user2@example.com",
        subscription: "3 months",
        subscription_type: "Premium",
        cardio: "Treadmill",
        mode_of_payment: "Cash",
        branch: "branch1",
        status: "active",
      });

      await User.create({
        id: 1001, // Same ID, different branch
        name: "Branch2 User 1",
        gender: "Male",
        mobile: "9876543220",
        email: "branch2user1@example.com",
        subscription: "3 months",
        subscription_type: "Premium",
        cardio: "Treadmill",
        mode_of_payment: "Cash",
        branch: "branch2",
        status: "active",
      });
    });

    it("should return only branch1 users for branch1 admin", async () => {
      const { token } = await createTestAdmin("branch1");

      const res = await request(app)
        .get("/api/admin/users")
        .set(authHeaders(token, "branch1"));

      expect(res.status).toBe(200);
      expect(res.body.users.length).toBe(2);
      res.body.users.forEach((user) => {
        expect(user.branch).toBe("branch1");
      });
    });

    it("should return only branch2 users for branch2 admin", async () => {
      const { token } = await createTestAdmin("branch2", "branch2admin");

      const res = await request(app)
        .get("/api/admin/users")
        .set(authHeaders(token, "branch2"));

      expect(res.status).toBe(200);
      expect(res.body.users.length).toBe(1);
      expect(res.body.users[0].branch).toBe("branch2");
    });

    it("should filter by status within branch", async () => {
      const { token } = await createTestAdmin("branch1");

      // Create inactive user in branch1
      await User.create({
        id: 1003,
        name: "Inactive User",
        gender: "Male",
        mobile: "9876543213",
        email: "inactive@example.com",
        subscription: "3 months",
        subscription_type: "Premium",
        cardio: "Treadmill",
        mode_of_payment: "Cash",
        branch: "branch1",
        status: "inactive",
      });

      const res = await request(app)
        .get("/api/admin/users?status=active")
        .set(authHeaders(token, "branch1"));

      expect(res.status).toBe(200);
      res.body.users.forEach((user) => {
        expect(user.status).toBe("active");
        expect(user.branch).toBe("branch1");
      });
    });
  });

  describe("Get user details with branch filtering", () => {
    beforeEach(async () => {
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
        id: 1001, // Same ID
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
    });

    it("should return user from admin's branch only", async () => {
      const { token } = await createTestAdmin("branch1");

      const res = await request(app)
        .get("/api/admin/user?id=1001")
        .set(authHeaders(token, "branch1"));

      expect(res.status).toBe(200);
      expect(res.body.email).toBe("branch1@example.com");
    });

    it("should not return user from different branch", async () => {
      const { token } = await createTestAdmin("branch1");

      // Try to get user by email from branch2
      const res = await request(app)
        .get("/api/admin/user?email=branch2@example.com")
        .set(authHeaders(token, "branch1"));

      expect(res.status).toBe(404);
    });
  });

  describe("Update user with branch isolation", () => {
    beforeEach(async () => {
      await User.create({
        id: 1001,
        name: "Original Name",
        gender: "Male",
        mobile: "9876543210",
        email: "update@example.com",
        subscription: "3 months",
        subscription_type: "Premium",
        cardio: "Treadmill",
        mode_of_payment: "Cash",
        branch: "branch1",
      });
    });

    it("should update user in admin's branch", async () => {
      const { token } = await createTestAdmin("branch1");

      const res = await request(app)
        .put("/api/admin/user?id=1001")
        .set(authHeaders(token, "branch1"))
        .send({
          name: "Updated Name",
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Updated Name");

      const user = await User.findOne({ id: 1001, branch: "branch1" });
      expect(user.name).toBe("Updated Name");
    });

    it("should not update user from different branch", async () => {
      const { token } = await createTestAdmin("branch1");

      // Create user in branch2
      await User.create({
        id: 1002,
        name: "Branch2 User",
        gender: "Male",
        mobile: "9876543212",
        email: "branch2@example.com",
        subscription: "3 months",
        subscription_type: "Premium",
        cardio: "Treadmill",
        mode_of_payment: "Cash",
        branch: "branch2",
      });

      const res = await request(app)
        .put("/api/admin/user?id=1002")
        .set(authHeaders(token, "branch1"))
        .send({
          name: "Should Not Update",
        });

      expect(res.status).toBe(404);
    });
  });
});
