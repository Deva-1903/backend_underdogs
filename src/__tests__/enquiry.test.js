const request = require("supertest");
const app = require("../app");
const { connectDB, clearDB, closeDB, createTestAdmin, authHeaders } = require("./testSetup");

beforeAll(async () => await connectDB());
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe("Enquiry - POST /api/admin/enquiries", () => {
  it("should create a new enquiry", async () => {
    const { token } = await createTestAdmin();

    const res = await request(app)
      .post("/api/admin/enquiries")
      .set(authHeaders(token))
      .send({
        name: "Interested Person",
        contactDetails: "9999999999",
        enquiryDate: new Date().toISOString(),
        notes: "Wants to know about pricing",
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Interested Person");
    expect(res.body.contactDetails).toBe("9999999999");
    expect(res.body.status).toBe("open");
    expect(res.body.branch).toBe("branch1");
  });
});

describe("Enquiry - GET /api/admin/enquiries", () => {
  it("should get all enquiries paginated", async () => {
    const { token } = await createTestAdmin();

    // Create multiple enquiries
    await request(app)
      .post("/api/admin/enquiries")
      .set(authHeaders(token))
      .send({
        name: "Person 1",
        contactDetails: "1111111111",
        enquiryDate: new Date().toISOString(),
        notes: "First enquiry",
      });
    await request(app)
      .post("/api/admin/enquiries")
      .set(authHeaders(token))
      .send({
        name: "Person 2",
        contactDetails: "2222222222",
        enquiryDate: new Date().toISOString(),
        notes: "Second enquiry",
      });

    const res = await request(app)
      .get("/api/admin/enquiries")
      .set(authHeaders(token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.currentPage).toBe(1);
    expect(res.body.totalPages).toBe(1);
  });

  it("should filter enquiries by status", async () => {
    const { token } = await createTestAdmin();

    await request(app)
      .post("/api/admin/enquiries")
      .set(authHeaders(token))
      .send({
        name: "Open Enquiry",
        contactDetails: "3333333333",
        enquiryDate: new Date().toISOString(),
        notes: "Still open",
      });

    const res = await request(app)
      .get("/api/admin/enquiries?status=open")
      .set(authHeaders(token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe("open");
  });

  it("should return empty for resolved when all are open", async () => {
    const { token } = await createTestAdmin();

    await request(app)
      .post("/api/admin/enquiries")
      .set(authHeaders(token))
      .send({
        name: "Open One",
        contactDetails: "4444444444",
        enquiryDate: new Date().toISOString(),
        notes: "Open",
      });

    const res = await request(app)
      .get("/api/admin/enquiries?status=resolved")
      .set(authHeaders(token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it("should respect branch isolation for enquiries", async () => {
    const { token: token1 } = await createTestAdmin("branch1");
    const { token: token2 } = await createTestAdmin("branch2");

    await request(app)
      .post("/api/admin/enquiries")
      .set(authHeaders(token1))
      .send({
        name: "Branch1 Enquiry",
        contactDetails: "5555555555",
        enquiryDate: new Date().toISOString(),
        notes: "For branch 1",
      });

    const res = await request(app)
      .get("/api/admin/enquiries")
      .set(authHeaders(token2, "branch2"));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});

describe("Enquiry - PUT /api/admin/enquiries/:id", () => {
  it("should update enquiry status to resolved", async () => {
    const { token } = await createTestAdmin();

    const created = await request(app)
      .post("/api/admin/enquiries")
      .set(authHeaders(token))
      .send({
        name: "To Resolve",
        contactDetails: "6666666666",
        enquiryDate: new Date().toISOString(),
        notes: "Will be resolved",
      });

    const res = await request(app)
      .put(`/api/admin/enquiries/${created.body._id}`)
      .set(authHeaders(token))
      .send({ status: "resolved" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("resolved");
  });

  it("should update enquiry status back to open", async () => {
    const { token } = await createTestAdmin();

    const created = await request(app)
      .post("/api/admin/enquiries")
      .set(authHeaders(token))
      .send({
        name: "Reopen",
        contactDetails: "7777777777",
        enquiryDate: new Date().toISOString(),
        notes: "Will reopen",
      });

    // First resolve
    await request(app)
      .put(`/api/admin/enquiries/${created.body._id}`)
      .set(authHeaders(token))
      .send({ status: "resolved" });

    // Then reopen
    const res = await request(app)
      .put(`/api/admin/enquiries/${created.body._id}`)
      .set(authHeaders(token))
      .send({ status: "open" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("open");
  });

  it("should return 404 for non-existent enquiry", async () => {
    const { token } = await createTestAdmin();

    const res = await request(app)
      .put("/api/admin/enquiries/507f1f77bcf86cd799439099")
      .set(authHeaders(token))
      .send({ status: "resolved" });

    expect(res.status).toBe(404);
  });
});
