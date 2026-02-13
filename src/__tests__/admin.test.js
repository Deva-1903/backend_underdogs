const request = require("supertest");
const app = require("../app");
const { connectDB, clearDB, closeDB, createTestAdmin, authHeaders } = require("./testSetup");

beforeAll(async () => await connectDB());
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

const sampleUser = {
  name: "Admin Test User",
  age: 30,
  gender: "Female",
  mobile: "7777777777",
  email: "admintest@example.com",
  healthIssues: "None",
  emergencyContactNo: "7777777778",
  height: "165",
  weight: "60",
  bloodGroup: "B+",
  address: "Admin Street",
  subscription: "3 months",
  subscription_type: "Premium",
  cardio: "Treadmill",
  mode_of_payment: "Card",
  joiningDate: new Date().toISOString(),
  occupation: "Manager",
  feesAmount: 4000,
  registrationFees: 500,
  adminName: "testadmin",
  isPending: "no",
  pendingAmount: 0,
};

describe("Cardio Types - CRUD /api/admin/cardio-types", () => {
  it("should add a cardio type", async () => {
    const { token } = await createTestAdmin();

    const res = await request(app)
      .post("/api/admin/cardio-types")
      .set(authHeaders(token))
      .send({ name: "Treadmill" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Treadmill");
    expect(res.body.branch).toBe("branch1");
  });

  it("should get all cardio types for branch", async () => {
    const { token } = await createTestAdmin();

    await request(app)
      .post("/api/admin/cardio-types")
      .set(authHeaders(token))
      .send({ name: "Treadmill" });
    await request(app)
      .post("/api/admin/cardio-types")
      .set(authHeaders(token))
      .send({ name: "Cycling" });

    const res = await request(app)
      .get("/api/admin/cardio-types")
      .set(authHeaders(token));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("should delete a cardio type", async () => {
    const { token } = await createTestAdmin();

    const created = await request(app)
      .post("/api/admin/cardio-types")
      .set(authHeaders(token))
      .send({ name: "Rowing" });

    const res = await request(app)
      .delete(`/api/admin/cardio-types/${created.body._id}`)
      .set(authHeaders(token));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Cardio type deleted successfully.");
  });

  it("should return 404 when deleting non-existent cardio type", async () => {
    const { token } = await createTestAdmin();

    const res = await request(app)
      .delete("/api/admin/cardio-types/507f1f77bcf86cd799439099")
      .set(authHeaders(token));

    expect(res.status).toBe(404);
  });
});

describe("Prices - CRUD /api/admin/prices", () => {
  it("should add a price", async () => {
    const { token } = await createTestAdmin();

    const res = await request(app)
      .post("/api/admin/prices")
      .set(authHeaders(token))
      .send({ price: 2000 });

    expect(res.status).toBe(201);
    expect(res.body.price).toBe(2000);
  });

  it("should get all prices sorted ascending", async () => {
    const { token } = await createTestAdmin();

    await request(app)
      .post("/api/admin/prices")
      .set(authHeaders(token))
      .send({ price: 5000 });
    await request(app)
      .post("/api/admin/prices")
      .set(authHeaders(token))
      .send({ price: 2000 });
    await request(app)
      .post("/api/admin/prices")
      .set(authHeaders(token))
      .send({ price: 3000 });

    const res = await request(app)
      .get("/api/admin/prices")
      .set(authHeaders(token));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0].price).toBe(2000);
    expect(res.body[1].price).toBe(3000);
    expect(res.body[2].price).toBe(5000);
  });

  it("should delete a price", async () => {
    const { token } = await createTestAdmin();

    const created = await request(app)
      .post("/api/admin/prices")
      .set(authHeaders(token))
      .send({ price: 1500 });

    const res = await request(app)
      .delete(`/api/admin/prices/${created.body._id}`)
      .set(authHeaders(token));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Price deleted successfully");
  });
});

describe("Brochures - CRUD /api/admin/brochure", () => {
  it("should add a brochure", async () => {
    const { token } = await createTestAdmin();

    const res = await request(app)
      .post("/api/admin/brochure")
      .set(authHeaders(token))
      .send({ photoURL: "https://example.com/brochure1.jpg" });

    expect(res.status).toBe(201);
    expect(res.body.photoURL).toBe("https://example.com/brochure1.jpg");
  });

  it("should get brochures for branch", async () => {
    const { token } = await createTestAdmin();

    await request(app)
      .post("/api/admin/brochure")
      .set(authHeaders(token))
      .send({ photoURL: "https://example.com/b1.jpg" });
    await request(app)
      .post("/api/admin/brochure")
      .set(authHeaders(token))
      .send({ photoURL: "https://example.com/b2.jpg" });

    const res = await request(app)
      .get("/api/admin/brochure")
      .set(authHeaders(token));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("should update a brochure URL", async () => {
    const { token } = await createTestAdmin();

    const created = await request(app)
      .post("/api/admin/brochure")
      .set(authHeaders(token))
      .send({ photoURL: "https://example.com/old.jpg" });

    const res = await request(app)
      .put(`/api/admin/brochure/${created.body._id}`)
      .set(authHeaders(token))
      .send({ photoURL: "https://example.com/new.jpg" });

    expect(res.status).toBe(200);
    expect(res.body.photoURL).toBe("https://example.com/new.jpg");
  });

  it("should return 404 when updating non-existent brochure", async () => {
    const { token } = await createTestAdmin();

    const res = await request(app)
      .put("/api/admin/brochure/507f1f77bcf86cd799439099")
      .set(authHeaders(token))
      .send({ photoURL: "https://example.com/new.jpg" });

    expect(res.status).toBe(404);
  });
});

describe("Pending Fees - /api/admin/pending-fees", () => {
  it("should get pending fees list", async () => {
    const { token } = await createTestAdmin();

    // Register user with pending fees
    await request(app)
      .post("/api/admin/user/register")
      .set(authHeaders(token))
      .send({ ...sampleUser, isPending: "yes", pendingAmount: 2000 });

    const res = await request(app)
      .get("/api/admin/pending-fees")
      .set(authHeaders(token));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].pendingAmount).toBe(2000);
    expect(res.body[0].paymentStatus).toBe("pending");
  });

  it("should make full payment on pending fees", async () => {
    const { token } = await createTestAdmin();

    const userRes = await request(app)
      .post("/api/admin/user/register")
      .set(authHeaders(token))
      .send({ ...sampleUser, isPending: "yes", pendingAmount: 2000 });

    const res = await request(app)
      .put(`/api/admin/pending-fees/${userRes.body.id}`)
      .set(authHeaders(token))
      .send({ amount: 2000, payment_mode: "Cash", adminName: "testadmin" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Payment completed successfully");
    expect(res.body.pendingAmount).toBe(0);
  });

  it("should make partial payment on pending fees", async () => {
    const { token } = await createTestAdmin();

    const userRes = await request(app)
      .post("/api/admin/user/register")
      .set(authHeaders(token))
      .send({ ...sampleUser, isPending: "yes", pendingAmount: 2000 });

    const res = await request(app)
      .put(`/api/admin/pending-fees/${userRes.body.id}`)
      .set(authHeaders(token))
      .send({ amount: 500, payment_mode: "UPI", adminName: "testadmin" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Partial payment made successfully");
    expect(res.body.pendingAmount).toBe(1500);
  });

  it("should reject overpayment", async () => {
    const { token } = await createTestAdmin();

    const userRes = await request(app)
      .post("/api/admin/user/register")
      .set(authHeaders(token))
      .send({ ...sampleUser, isPending: "yes", pendingAmount: 2000 });

    const res = await request(app)
      .put(`/api/admin/pending-fees/${userRes.body.id}`)
      .set(authHeaders(token))
      .send({ amount: 5000, payment_mode: "Cash", adminName: "testadmin" });

    expect(res.status).toBe(400);
  });
});

describe("Fees Details - DELETE /api/admin/fees/:id", () => {
  it("should delete a fees detail record", async () => {
    const { token } = await createTestAdmin();

    // Register user creates a fees detail
    await request(app)
      .post("/api/admin/user/register")
      .set(authHeaders(token))
      .send(sampleUser);

    const feesRes = await request(app)
      .get("/api/admin/fees-details")
      .set(authHeaders(token));

    const feesId = feesRes.body[0]._id;

    const res = await request(app)
      .delete(`/api/admin/fees/${feesId}`)
      .set(authHeaders(token));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Fees detail deleted successfully.");
  });

  it("should return 404 for non-existent fees detail", async () => {
    const { token } = await createTestAdmin();

    const res = await request(app)
      .delete("/api/admin/fees/507f1f77bcf86cd799439099")
      .set(authHeaders(token));

    expect(res.status).toBe(404);
  });
});

describe("Admin Names - GET /api/admin/admin-names", () => {
  it("should return distinct admin usernames", async () => {
    const { token } = await createTestAdmin();

    const res = await request(app)
      .get("/api/admin/admin-names")
      .set(authHeaders(token));

    expect(res.status).toBe(200);
    expect(res.body).toContain("testadmin");
  });
});

describe("All Admins - GET /api/admin/get-all", () => {
  it("should return admins without password/salt", async () => {
    const { token } = await createTestAdmin();

    const res = await request(app)
      .get("/api/admin/get-all")
      .set(authHeaders(token));

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    res.body.forEach((admin) => {
      expect(admin).not.toHaveProperty("password");
      expect(admin).not.toHaveProperty("salt");
    });
  });
});

describe("Contact Forms - /api/admin/contact-forms", () => {
  it("should get contact forms paginated", async () => {
    const { token } = await createTestAdmin();

    // Create a contact form via public route
    await request(app).post("/api/contact-form").send({
      name: "Test Person",
      email: "contact@example.com",
      message: "Hello there",
    });

    const res = await request(app)
      .get("/api/admin/contact-forms")
      .set(authHeaders(token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.currentPage).toBe(1);
    expect(res.body.totalPages).toBe(1);
  });

  it("should delete a contact form", async () => {
    const { token } = await createTestAdmin();

    const created = await request(app).post("/api/contact-form").send({
      name: "Delete Me",
      email: "delete@example.com",
      message: "Remove this",
    });

    const formsRes = await request(app)
      .get("/api/admin/contact-forms")
      .set(authHeaders(token));

    const formId = formsRes.body.data[0]._id;

    const res = await request(app)
      .delete(`/api/admin/contact-form/${formId}`)
      .set(authHeaders(token));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Contact form deleted successfully");
  });
});
