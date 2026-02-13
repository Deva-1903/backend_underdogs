const request = require("supertest");
const app = require("../app");
const { connectDB, clearDB, closeDB, createTestAdmin, authHeaders } = require("./testSetup");

beforeAll(async () => await connectDB());
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe("Auth - POST /api/admin/login", () => {
  it("should login an admin with valid credentials", async () => {
    const { admin } = await createTestAdmin();

    const res = await request(app).post("/api/admin/login").send({
      username: "testadmin",
      password: "testpass123",
      branch: "branch1",
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.username).toBe("testadmin");
    expect(res.body.branch).toBe("branch1");
    expect(res.body._id).toBeDefined();
  });

  it("should reject login with wrong password", async () => {
    await createTestAdmin();

    const res = await request(app).post("/api/admin/login").send({
      username: "testadmin",
      password: "wrongpassword",
      branch: "branch1",
    });

    expect(res.status).toBe(400);
  });

  it("should reject login with non-existent admin", async () => {
    const res = await request(app).post("/api/admin/login").send({
      username: "nobody",
      password: "testpass123",
      branch: "branch1",
    });

    expect(res.status).toBe(403);
  });

  it("should reject login with wrong branch", async () => {
    await createTestAdmin("branch1");

    const res = await request(app).post("/api/admin/login").send({
      username: "testadmin",
      password: "testpass123",
      branch: "branch2",
    });

    expect(res.status).toBe(403);
  });
});

describe("Auth - POST /api/admin (register admin)", () => {
  it("should register a new admin when authenticated", async () => {
    const { token } = await createTestAdmin();

    const res = await request(app)
      .post("/api/admin")
      .set(authHeaders(token))
      .send({
        username: "newadmin",
        password: "newpass123",
      });

    expect(res.status).toBe(201);
    expect(res.body.username).toBe("newadmin");
    expect(res.body.branch).toBe("branch1");
    expect(res.body).toHaveProperty("token");
  });

  it("should reject duplicate admin for same branch", async () => {
    const { token } = await createTestAdmin();

    const res = await request(app)
      .post("/api/admin")
      .set(authHeaders(token))
      .send({
        username: "testadmin",
        password: "anotherpass",
      });

    expect(res.status).toBe(400);
  });

  it("should reject register without required fields", async () => {
    const { token } = await createTestAdmin();

    const res = await request(app)
      .post("/api/admin")
      .set(authHeaders(token))
      .send({ username: "onlyuser" });

    expect(res.status).toBe(400);
  });
});

describe("Auth - DELETE /api/admin/:id", () => {
  it("should delete an admin by ID", async () => {
    const { token, admin } = await createTestAdmin();

    const res = await request(app)
      .delete(`/api/admin/${admin._id}`)
      .set(authHeaders(token));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Admin deleted successfully");
  });

  it("should return 404 for non-existent admin ID", async () => {
    const { token } = await createTestAdmin();

    const res = await request(app)
      .delete("/api/admin/507f1f77bcf86cd799439099")
      .set(authHeaders(token));

    expect(res.status).toBe(404);
  });
});

describe("Auth - Protected routes without token", () => {
  it("should return 401 when accessing protected route without token", async () => {
    const res = await request(app).get("/api/admin/users");
    expect(res.status).toBe(401);
  });

  it("should return 401 with invalid token", async () => {
    const res = await request(app)
      .get("/api/admin/users")
      .set({ Authorization: "Bearer invalidtoken123", "x-branch": "branch1" });

    expect(res.status).toBe(401);
  });
});
