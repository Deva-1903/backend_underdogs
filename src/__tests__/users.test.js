const request = require("supertest");
const app = require("../app");
const { connectDB, clearDB, closeDB, createTestAdmin, authHeaders } = require("./testSetup");

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

/** Helper to register a user and return the response */
const registerUser = async (token, userData = {}) => {
  return request(app)
    .post("/api/admin/user/register")
    .set(authHeaders(token))
    .send({ ...sampleUser, ...userData });
};

describe("Users - POST /api/admin/user/register", () => {
  it("should register a new user", async () => {
    const { token } = await createTestAdmin();

    const res = await registerUser(token);

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("John Doe");
    expect(res.body.email).toBe("john@example.com");
    expect(res.body.id).toBe(1001);
    expect(res.body).toHaveProperty("invoice_id");
    expect(res.body).toHaveProperty("planEnds");
    expect(res.body.transaction_type).toBe("New User");
  });

  it("should auto-increment user IDs", async () => {
    const { token } = await createTestAdmin();

    await registerUser(token);
    const res = await registerUser(token, {
      email: "jane@example.com",
      mobile: "9876543222",
      name: "Jane Doe",
    });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(1002);
  });

  it("should reject duplicate email in same branch", async () => {
    const { token } = await createTestAdmin();

    await registerUser(token);
    const res = await registerUser(token);

    expect(res.status).toBe(400);
  });

  it("should reject duplicate mobile in same branch", async () => {
    const { token } = await createTestAdmin();

    await registerUser(token);
    const res = await registerUser(token, { email: "different@example.com" });

    expect(res.status).toBe(400);
  });

  it("should create pending fees when isPending is yes", async () => {
    const { token } = await createTestAdmin();

    const res = await registerUser(token, {
      isPending: "yes",
      pendingAmount: 1000,
    });

    expect(res.status).toBe(201);
    expect(res.body.pending_amount).toBe(1000);

    // Verify pending fees via API
    const pendingRes = await request(app)
      .get(`/api/admin/pending-fees/${res.body.id}`)
      .set(authHeaders(token));

    expect(pendingRes.body.pendingAmount).toBe(1000);
  });

  it("should calculate planEnds correctly for months", async () => {
    const { token } = await createTestAdmin();
    const joiningDate = "2025-01-15T00:00:00.000Z";

    const res = await registerUser(token, {
      subscription: "3 months",
      joiningDate,
    });

    expect(res.status).toBe(201);
    const planEnds = new Date(res.body.planEnds);
    expect(planEnds.getMonth()).toBe(3); // April (0-indexed)
  });
});

describe("Users - GET /api/admin/user", () => {
  it("should get user by ID", async () => {
    const { token } = await createTestAdmin();
    await registerUser(token);

    const res = await request(app)
      .get("/api/admin/user?id=1001")
      .set(authHeaders(token));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1001);
    expect(res.body.name).toBe("John Doe");
    expect(res.body).toHaveProperty("pendingFees");
  });

  it("should get user by email", async () => {
    const { token } = await createTestAdmin();
    await registerUser(token);

    const res = await request(app)
      .get("/api/admin/user?email=john@example.com")
      .set(authHeaders(token));

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("john@example.com");
  });

  it("should get user by mobile", async () => {
    const { token } = await createTestAdmin();
    await registerUser(token);

    const res = await request(app)
      .get("/api/admin/user?mobile=9876543210")
      .set(authHeaders(token));

    expect(res.status).toBe(200);
    expect(res.body.mobile).toBe("9876543210");
  });

  it("should return 404 for non-existent user", async () => {
    const { token } = await createTestAdmin();

    const res = await request(app)
      .get("/api/admin/user?id=9999")
      .set(authHeaders(token));

    expect(res.status).toBe(404);
  });

  it("should return 400 when no query param provided", async () => {
    const { token } = await createTestAdmin();

    const res = await request(app)
      .get("/api/admin/user")
      .set(authHeaders(token));

    expect(res.status).toBe(400);
  });
});

describe("Users - GET /api/admin/users (list)", () => {
  it("should return paginated users", async () => {
    const { token } = await createTestAdmin();
    await registerUser(token);
    await registerUser(token, {
      email: "jane@example.com",
      mobile: "1111111111",
    });

    const res = await request(app)
      .get("/api/admin/users")
      .set(authHeaders(token));

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(2);
    expect(res.body.page).toBe(1);
    expect(res.body.totalItems).toBe(2);
  });

  it("should filter users by active status", async () => {
    const { token } = await createTestAdmin();
    await registerUser(token);

    const res = await request(app)
      .get("/api/admin/users?status=active")
      .set(authHeaders(token));

    expect(res.status).toBe(200);
    expect(res.body.users.length).toBeGreaterThanOrEqual(1);
    res.body.users.forEach((user) => {
      expect(user.status).toBe("active");
    });
  });

  it("should filter users by inactive status", async () => {
    const { token } = await createTestAdmin();
    await registerUser(token);

    const res = await request(app)
      .get("/api/admin/users?status=inactive")
      .set(authHeaders(token));

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(0);
  });

  it("should respect branch isolation", async () => {
    const { token: token1 } = await createTestAdmin("branch1");
    await registerUser(token1);

    const { token: token2 } = await createTestAdmin("branch2");

    const res = await request(app)
      .get("/api/admin/users")
      .set(authHeaders(token2, "branch2"));

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(0);
  });
});

describe("Users - PUT /api/admin/user", () => {
  it("should update user fields", async () => {
    const { token } = await createTestAdmin();
    await registerUser(token);

    const res = await request(app)
      .put("/api/admin/user?id=1001")
      .set(authHeaders(token))
      .send({
        name: "John Updated",
        weight: "75",
        address: "456 New Street",
      });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("John Updated");
    expect(res.body.weight).toBe("75");
    expect(res.body.address).toBe("456 New Street");
    // Unchanged fields should persist
    expect(res.body.email).toBe("john@example.com");
  });

  it("should return 404 for non-existent user", async () => {
    const { token } = await createTestAdmin();

    const res = await request(app)
      .put("/api/admin/user?id=9999")
      .set(authHeaders(token))
      .send({ name: "Nobody" });

    expect(res.status).toBe(404);
  });
});

describe("Users - GET /api/admin/pending-fees/:id", () => {
  it("should return 0 when no pending fees", async () => {
    const { token } = await createTestAdmin();
    await registerUser(token);

    const res = await request(app)
      .get("/api/admin/pending-fees/1001")
      .set(authHeaders(token));

    expect(res.status).toBe(200);
    expect(res.body.pendingAmount).toBe(0);
  });

  it("should return pending amount when fees exist", async () => {
    const { token } = await createTestAdmin();
    await registerUser(token, { isPending: "yes", pendingAmount: 2000 });

    const res = await request(app)
      .get("/api/admin/pending-fees/1001")
      .set(authHeaders(token));

    expect(res.status).toBe(200);
    expect(res.body.pendingAmount).toBe(2000);
  });
});

describe("Users - GET /api/admin/total-fees", () => {
  it("should return total fees in date range", async () => {
    const { token } = await createTestAdmin();
    await registerUser(token);

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 1);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 1);

    const res = await request(app)
      .get(
        `/api/admin/total-fees?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )
      .set(authHeaders(token));

    expect(res.status).toBe(200);
    expect(res.body.totalAmount).toBe(3500); // feesAmount(3000) + registrationFees(500)
  });

  it("should return 400 without date range", async () => {
    const { token } = await createTestAdmin();

    const res = await request(app)
      .get("/api/admin/total-fees")
      .set(authHeaders(token));

    expect(res.status).toBe(400);
  });
});
