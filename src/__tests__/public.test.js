const request = require("supertest");
const app = require("../app");
const { connectDB, clearDB, closeDB, createTestAdmin, authHeaders } = require("./testSetup");
const Attendance = require("../../model/attendanceModel");
const User = require("../../model/userModel");
const Brochure = require("../../model/brochureModel");
const TeamMember = require("../../model/teamMemberModel");

beforeAll(async () => await connectDB());
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe("Public - GET /", () => {
  it("should return server status", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Server is up...");
  });
});

describe("Public - POST /api/contact-form", () => {
  it("should submit a contact form", async () => {
    const res = await request(app).post("/api/contact-form").send({
      name: "Jane Smith",
      email: "jane@example.com",
      message: "I want to join the gym",
    });

    expect(res.status).toBe(201);
    expect(res.body.fullName).toBe("Jane Smith");
    expect(res.body.email).toBe("jane@example.com");
    expect(res.body.message).toBe("I want to join the gym");
    expect(res.body).toHaveProperty("_id");
  });

  it("should reject contact form without required fields", async () => {
    const res = await request(app).post("/api/contact-form").send({
      name: "Only Name",
    });

    expect(res.status).toBe(400);
  });

  it("should reject contact form without email", async () => {
    const res = await request(app).post("/api/contact-form").send({
      name: "No Email",
      message: "Hello",
    });

    expect(res.status).toBe(400);
  });
});

describe("Public - GET /api/users/public", () => {
  it("should get user details by ID (public)", async () => {
    const { token } = await createTestAdmin();

    // Register user via admin
    await request(app)
      .post("/api/admin/user/register")
      .set(authHeaders(token))
      .send({
        name: "Public User",
        age: 22,
        gender: "Male",
        mobile: "5555555555",
        email: "public@example.com",
        healthIssues: "None",
        emergencyContactNo: "5555555556",
        height: "170",
        weight: "65",
        bloodGroup: "O+",
        address: "Public Street",
        subscription: "3 months",
        subscription_type: "Basic",
        cardio: "Cycling",
        mode_of_payment: "Cash",
        joiningDate: new Date().toISOString(),
        occupation: "Student",
        feesAmount: 3000,
        registrationFees: 500,
        adminName: "testadmin",
        isPending: "no",
        pendingAmount: 0,
      });

    const res = await request(app).get(
      "/api/users/public?id=1001&branch=branch1"
    );

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1001);
    expect(res.body.name).toBe("Public User");
    expect(res.body).toHaveProperty("status");
    expect(res.body).toHaveProperty("planEnds");
    expect(res.body).toHaveProperty("pendingFees");
  });

  it("should return 404 for non-existent user (public)", async () => {
    const res = await request(app).get(
      "/api/users/public?id=9999&branch=branch1"
    );

    expect(res.status).toBe(404);
  });

  it("should return 400 without search param", async () => {
    const res = await request(app).get("/api/users/public?branch=branch1");

    expect(res.status).toBe(400);
  });
});

describe("Public - POST /api/attendance", () => {
  let testUser;

  beforeEach(async () => {
    // Create a user directly in DB for attendance tests
    testUser = await User.create({
      id: 1001,
      name: "Attendance User",
      age: 25,
      gender: "Male",
      mobile: "6666666666",
      email: "attend@example.com",
      subscription: "3 months",
      subscription_type: "Premium",
      cardio: "Treadmill",
      mode_of_payment: "Cash",
      status: "active",
      planEnds: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      branch: "branch1",
    });
  });

  it("should reject attendance without user ID", async () => {
    const res = await request(app).post("/api/attendance").send({
      branch: "branch1",
    });

    expect(res.status).toBe(404);
  });

  it("should reject attendance without branch", async () => {
    const res = await request(app).post("/api/attendance").send({
      id: "1001",
    });

    expect(res.status).toBe(404);
  });

  it("should reject non-numeric user ID", async () => {
    const res = await request(app).post("/api/attendance").send({
      id: "abc",
      branch: "branch1",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid user Id");
  });

  it("should return 404 for non-existent user", async () => {
    const res = await request(app).post("/api/attendance").send({
      id: "9999",
      branch: "branch1",
    });

    expect(res.status).toBe(404);
  });
});

describe("Public - GET /api/brochure", () => {
  it("should get brochures for a branch", async () => {
    await Brochure.create({ photoURL: "https://example.com/b1.jpg", branch: "branch1" });
    await Brochure.create({ photoURL: "https://example.com/b2.jpg", branch: "branch1" });

    const res = await request(app).get("/api/brochure?branch=branch1");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("should return empty array for branch with no brochures", async () => {
    const res = await request(app).get("/api/brochure?branch=branch2");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

describe("Public - GET /api/team-members", () => {
  it("should get all team members", async () => {
    await TeamMember.create({
      name: "Coach One",
      role: "Head Trainer",
      image: "https://example.com/coach1.jpg",
      email: "coach1@example.com",
      yearsOfExperience: 5,
      specialization: "Strength",
      certifications: ["CPT", "CSCS"],
      bio: "Experienced trainer",
      phoneNumber: "1234567890",
    });

    const res = await request(app).get("/api/team-members");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Coach One");
    expect(res.body[0].role).toBe("Head Trainer");
  });

  it("should return empty array when no team members", async () => {
    const res = await request(app).get("/api/team-members");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

describe("Admin - Attendance GET /api/admin/attendance", () => {
  it("should get attendance records by date", async () => {
    // Create attendance directly
    const today = new Date();
    await Attendance.create({
      number: 1,
      user_id: 1001,
      user_name: "Test User",
      timeIn: "10:00:00 am",
      subscription: "3 months",
      subscription_type: "Premium",
      session: "morning",
      date: today,
      status: "active",
      pendingAmount: 0,
      branch: "branch1",
    });

    const res = await request(app)
      .get(`/api/admin/attendance?date=${today.toISOString()}&branch=branch1`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].user_name).toBe("Test User");
  });

  it("should filter attendance by session", async () => {
    const today = new Date();
    await Attendance.create({
      number: 1,
      user_id: 1001,
      user_name: "Morning User",
      timeIn: "10:00:00 am",
      subscription: "3 months",
      subscription_type: "Basic",
      session: "morning",
      date: today,
      status: "active",
      pendingAmount: 0,
      branch: "branch1",
    });
    await Attendance.create({
      number: 1,
      user_id: 1002,
      user_name: "Evening User",
      timeIn: "6:00:00 pm",
      subscription: "3 months",
      subscription_type: "Premium",
      session: "evening",
      date: today,
      status: "active",
      pendingAmount: 0,
      branch: "branch1",
    });

    const res = await request(app)
      .get(
        `/api/admin/attendance?date=${today.toISOString()}&session=morning&branch=branch1`
      );

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].session).toBe("morning");
  });
});
