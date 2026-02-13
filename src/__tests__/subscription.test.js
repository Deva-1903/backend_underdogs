const request = require("supertest");
const app = require("../app");
const { connectDB, clearDB, closeDB, createTestAdmin, authHeaders } = require("./testSetup");
const User = require("../../model/userModel");

beforeAll(async () => await connectDB());
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

const sampleUser = {
  name: "Sub User",
  age: 28,
  gender: "Male",
  mobile: "8888888888",
  email: "sub@example.com",
  healthIssues: "None",
  emergencyContactNo: "8888888889",
  height: "180",
  weight: "80",
  bloodGroup: "A+",
  address: "Sub Street",
  subscription: "1 month",
  subscription_type: "Basic",
  cardio: "Cycling",
  mode_of_payment: "UPI",
  joiningDate: new Date().toISOString(),
  occupation: "Trainer",
  feesAmount: 2000,
  registrationFees: 500,
  adminName: "testadmin",
  isPending: "no",
  pendingAmount: 0,
};

/** Helper to register a user */
const registerUser = async (token) => {
  const res = await request(app)
    .post("/api/admin/user/register")
    .set(authHeaders(token))
    .send(sampleUser);
  return res.body;
};

describe("Subscription - PUT /api/admin/user/subscription", () => {
  it("should renew a user subscription", async () => {
    const { token } = await createTestAdmin();
    const user = await registerUser(token);

    const res = await request(app)
      .put(`/api/admin/user/subscription?id=${user.id}`)
      .set(authHeaders(token))
      .send({
        subscription: "6 months",
        subscription_type: "Premium",
        cardio: "Treadmill",
        mode_of_payment: "Card",
        feesAmount: 6000,
        adminName: "testadmin",
        isPending: "no",
        pendingAmount: 0,
      });

    expect(res.status).toBe(200);
    expect(res.body.subscription).toBe("6 months");
    expect(res.body.subscription_type).toBe("Premium");
    expect(res.body.status).toBe("active");
    expect(res.body.transaction_type).toBe("Fees Renewal");
    expect(res.body).toHaveProperty("invoice_id");
    expect(res.body.feesAmount).toBe(6000);
  });

  it("should handle subscription renewal with pending fees", async () => {
    const { token } = await createTestAdmin();
    const user = await registerUser(token);

    const res = await request(app)
      .put(`/api/admin/user/subscription?id=${user.id}`)
      .set(authHeaders(token))
      .send({
        subscription: "3 months",
        subscription_type: "Basic",
        cardio: "Cycling",
        mode_of_payment: "Cash",
        feesAmount: 3000,
        adminName: "testadmin",
        isPending: "yes",
        pendingAmount: 1500,
      });

    expect(res.status).toBe(200);
    expect(res.body.pending_amount).toBe(1500);

    // Verify pending fees were created
    const pendingRes = await request(app)
      .get(`/api/admin/pending-fees/${user.id}`)
      .set(authHeaders(token));

    expect(pendingRes.body.pendingAmount).toBe(1500);
  });

  it("should reactivate an inactive user on renewal", async () => {
    const { token } = await createTestAdmin();
    const user = await registerUser(token);

    // Manually set user to inactive
    await User.findOneAndUpdate(
      { id: user.id, branch: "branch1" },
      { status: "inactive" }
    );

    const res = await request(app)
      .put(`/api/admin/user/subscription?id=${user.id}`)
      .set(authHeaders(token))
      .send({
        subscription: "1 month",
        subscription_type: "Basic",
        cardio: "Cycling",
        mode_of_payment: "Cash",
        feesAmount: 2000,
        adminName: "testadmin",
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("active");
  });

  it("should return 404 for non-existent user", async () => {
    const { token } = await createTestAdmin();

    const res = await request(app)
      .put("/api/admin/user/subscription?id=9999")
      .set(authHeaders(token))
      .send({
        subscription: "1 month",
        subscription_type: "Basic",
        cardio: "Cycling",
        mode_of_payment: "Cash",
        feesAmount: 2000,
        adminName: "testadmin",
      });

    expect(res.status).toBe(404);
  });

  it("should return 400 without subscription field", async () => {
    const { token } = await createTestAdmin();
    const user = await registerUser(token);

    const res = await request(app)
      .put(`/api/admin/user/subscription?id=${user.id}`)
      .set(authHeaders(token))
      .send({ mode_of_payment: "Cash" });

    expect(res.status).toBe(400);
  });
});

describe("Subscription - GET /api/admin/fees-details", () => {
  it("should return fees details", async () => {
    const { token } = await createTestAdmin();
    await registerUser(token);

    const res = await request(app)
      .get("/api/admin/fees-details")
      .set(authHeaders(token));

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty("user_id");
    expect(res.body[0]).toHaveProperty("amount");
    expect(res.body[0]).toHaveProperty("transaction_type");
  });

  it("should filter fees details by date range", async () => {
    const { token } = await createTestAdmin();
    await registerUser(token);

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 1);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 1);

    const res = await request(app)
      .get(
        `/api/admin/fees-details?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )
      .set(authHeaders(token));

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Subscription Options - CRUD /api/admin/subscription-options", () => {
  it("should add a subscription option", async () => {
    const { token } = await createTestAdmin();

    const res = await request(app)
      .post("/api/admin/subscription-options")
      .set(authHeaders(token))
      .send({ name: "3" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("3 months");
  });

  it("should format singular month correctly", async () => {
    const { token } = await createTestAdmin();

    const res = await request(app)
      .post("/api/admin/subscription-options")
      .set(authHeaders(token))
      .send({ name: "1" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("1 month");
  });

  it("should reject invalid subscription option", async () => {
    const { token } = await createTestAdmin();

    const res = await request(app)
      .post("/api/admin/subscription-options")
      .set(authHeaders(token))
      .send({ name: "abc" });

    expect(res.status).toBe(400);
  });

  it("should get all subscription options sorted", async () => {
    const { token } = await createTestAdmin();

    await request(app)
      .post("/api/admin/subscription-options")
      .set(authHeaders(token))
      .send({ name: "6" });
    await request(app)
      .post("/api/admin/subscription-options")
      .set(authHeaders(token))
      .send({ name: "1" });
    await request(app)
      .post("/api/admin/subscription-options")
      .set(authHeaders(token))
      .send({ name: "3" });

    const res = await request(app)
      .get("/api/admin/subscription-options")
      .set(authHeaders(token));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0].name).toBe("1 month");
    expect(res.body[1].name).toBe("3 months");
    expect(res.body[2].name).toBe("6 months");
  });

  it("should delete a subscription option", async () => {
    const { token } = await createTestAdmin();

    const created = await request(app)
      .post("/api/admin/subscription-options")
      .set(authHeaders(token))
      .send({ name: "3" });

    const res = await request(app)
      .delete(`/api/admin/subscription-options/${created.body._id}`)
      .set(authHeaders(token));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Subscription option deleted successfully.");
  });
});

describe("Subscription Types - CRUD /api/admin/subscription-types", () => {
  it("should add a subscription type", async () => {
    const { token } = await createTestAdmin();

    const res = await request(app)
      .post("/api/admin/subscription-types")
      .set(authHeaders(token))
      .send({ name: "Premium" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Premium");
  });

  it("should get all subscription types", async () => {
    const { token } = await createTestAdmin();

    await request(app)
      .post("/api/admin/subscription-types")
      .set(authHeaders(token))
      .send({ name: "Basic" });
    await request(app)
      .post("/api/admin/subscription-types")
      .set(authHeaders(token))
      .send({ name: "Premium" });

    const res = await request(app)
      .get("/api/admin/subscription-types")
      .set(authHeaders(token));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("should delete a subscription type", async () => {
    const { token } = await createTestAdmin();

    const created = await request(app)
      .post("/api/admin/subscription-types")
      .set(authHeaders(token))
      .send({ name: "Temp Type" });

    const res = await request(app)
      .delete(`/api/admin/subscription-types/${created.body._id}`)
      .set(authHeaders(token));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Subscription type deleted successfully.");
  });
});
