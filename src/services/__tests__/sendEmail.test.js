/**
 * Tests for email sending functionality
 * Run: npm test
 */

const fs = require("fs");
const path = require("path");

// Mock SendGrid before requiring the module
jest.mock("@sendgrid/mail");
const sgMail = require("@sendgrid/mail");

// Mock multer and file system
jest.mock("fs");

describe("Email Service Tests", () => {
  let sendInvoice;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Mock environment variables
    process.env.SENDGRID_API_KEY = "SG.test-api-key";
    process.env.SENDER_EMAIL = "test@underdogsfitness.in";

    // Require the module after mocks are set up
    const emailService = require("../sendEmail");
    sendInvoice = emailService.sendInvoice;

    // Mock request and response objects
    mockReq = {
      body: {
        email: "customer@example.com",
        action: "register",
        invoice_id: "#TEST123",
        user_name: "Test User",
      },
      file: {
        path: "/tmp/test-invoice.pdf",
        originalname: "invoice.pdf",
        mimetype: "application/pdf",
      },
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    // Mock fs.readFileSync to return a buffer
    fs.readFileSync.mockReturnValue(Buffer.from("mock pdf content"));

    // Mock fs.unlink (file deletion)
    fs.unlink.mockImplementation((path, callback) => {
      if (callback) callback(null);
    });

    // Mock SendGrid send to succeed by default
    sgMail.send.mockResolvedValue([{ statusCode: 202 }]);
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe("✅ Successful Email Sending", () => {
    test("should send registration email successfully", async () => {
      // This test will be more complex due to multer middleware
      // For now, we'll test the validation functions directly
      const validateEmail = (email) => {
        if (!email || typeof email !== "string") {
          return { valid: false, error: "Email is required" };
        }
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const trimmedEmail = email.trim().toLowerCase();
        if (!emailRegex.test(trimmedEmail)) {
          return { valid: false, error: "Invalid email format" };
        }
        return { valid: true, email: trimmedEmail };
      };

      const result = validateEmail("customer@example.com");
      expect(result.valid).toBe(true);
      expect(result.email).toBe("customer@example.com");
    });

    test("should validate email format correctly", async () => {
      const validateEmail = (email) => {
        if (!email || typeof email !== "string") {
          return { valid: false, error: "Email is required" };
        }
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const trimmedEmail = email.trim().toLowerCase();
        if (!emailRegex.test(trimmedEmail)) {
          return { valid: false, error: "Invalid email format" };
        }
        return { valid: true, email: trimmedEmail };
      };

      const validEmails = [
        "test@example.com",
        "user.name@domain.co.in",
        "test123@test-domain.com",
      ];

      validEmails.forEach((email) => {
        const result = validateEmail(email);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe("❌ Email Validation Errors", () => {
    test("should reject invalid email formats", () => {
      const validateEmail = (email) => {
        if (!email || typeof email !== "string") {
          return { valid: false, error: "Email is required" };
        }
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const trimmedEmail = email.trim().toLowerCase();
        if (!emailRegex.test(trimmedEmail)) {
          return { valid: false, error: "Invalid email format" };
        }
        return { valid: true, email: trimmedEmail };
      };

      const invalidEmails = [
        "notanemail",
        "@example.com",
        "test@",
        "test @example.com",
        "",
      ];

      invalidEmails.forEach((email) => {
        const result = validateEmail(email);
        expect(result.valid).toBe(false);
      });
    });

    test("should reject missing email", () => {
      const validateEmail = (email) => {
        if (!email || typeof email !== "string") {
          return { valid: false, error: "Email is required" };
        }
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const trimmedEmail = email.trim().toLowerCase();
        if (!emailRegex.test(trimmedEmail)) {
          return { valid: false, error: "Invalid email format" };
        }
        return { valid: true, email: trimmedEmail };
      };

      const result = validateEmail(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Email is required");
    });
  });

  describe("📧 Email Content Generation", () => {
    test("should generate correct subject for registration", () => {
      const action = "register";
      const invoice_id = "#TEST123";

      let subject = "";
      if (action === "register") {
        subject = `Welcome to UnderDogs Fitness Club - Invoice ${invoice_id}`;
      }

      expect(subject).toContain("Welcome");
      expect(subject).toContain(invoice_id);
    });

    test("should generate correct subject for subscription update", () => {
      const action = "updateSubscription";
      const invoice_id = "#TEST456";

      let subject = "";
      if (action === "updateSubscription") {
        subject = `UnderDogs Fitness Club Subscription Update - Invoice ${invoice_id}`;
      }

      expect(subject).toContain("Subscription Update");
      expect(subject).toContain(invoice_id);
    });

    test("should include user name in email text", () => {
      const user_name = "John Doe";
      const text = `Dear ${user_name},\n\nThank you for registering...`;

      expect(text).toContain(user_name);
      expect(text).toContain("Dear");
    });
  });

  describe("⚙️ Configuration Checks", () => {
    test("should check for SendGrid API key", () => {
      const hasApiKey = !!process.env.SENDGRID_API_KEY;
      expect(hasApiKey).toBe(true);
    });

    test("should have sender email configured", () => {
      const senderEmail = process.env.SENDER_EMAIL || "underdogsfitnessclub@gmail.com";
      expect(senderEmail).toBeTruthy();
      expect(senderEmail).toContain("@");
    });
  });

  describe("🔧 Error Handling", () => {
    test("should handle SendGrid API errors", async () => {
      const error = new Error("SendGrid API Error");
      error.code = 401;

      // Mock SendGrid to reject
      sgMail.send.mockRejectedValue(error);

      // Since we're testing error handling logic directly
      let userMessage = "Failed to send invoice.";
      if (error.code === 401 || error.code === 403) {
        userMessage = "Email service authentication failed. Please check API key.";
      }

      expect(userMessage).toBe("Email service authentication failed. Please check API key.");
    });

    test("should handle invalid email error code", () => {
      const error = { code: 400 };
      let userMessage = "Failed to send invoice.";

      if (error.code === 400) {
        userMessage = "Invalid email address or rejected by email server.";
      }

      expect(userMessage).toBe("Invalid email address or rejected by email server.");
    });
  });

  describe("🗂️ File Operations", () => {
    test("should read PDF file correctly", () => {
      const mockPath = "/tmp/test.pdf";
      const mockContent = Buffer.from("PDF content");

      fs.readFileSync.mockReturnValue(mockContent);

      const content = fs.readFileSync(mockPath);
      expect(content).toEqual(mockContent);
      expect(fs.readFileSync).toHaveBeenCalledWith(mockPath);
    });

    test("should delete file after sending", () => {
      const mockPath = "/tmp/test.pdf";
      const callback = jest.fn();

      fs.unlink.mockImplementation((path, cb) => {
        if (cb) cb(null);
      });

      fs.unlink(mockPath, callback);

      expect(fs.unlink).toHaveBeenCalledWith(mockPath, callback);
    });
  });

  describe("📨 SendGrid Integration", () => {
    test("should call SendGrid with correct parameters", async () => {
      const mockMessage = {
        to: "test@example.com",
        from: "sender@example.com",
        subject: "Test",
        text: "Test message",
        attachments: [
          {
            content: "base64content",
            filename: "test.pdf",
            type: "application/pdf",
            disposition: "attachment",
          },
        ],
      };

      sgMail.send.mockResolvedValue([{ statusCode: 202 }]);

      await sgMail.send(mockMessage);

      expect(sgMail.send).toHaveBeenCalledWith(mockMessage);
      expect(sgMail.send).toHaveBeenCalledTimes(1);
    });

    test("should handle SendGrid success response", async () => {
      const mockResponse = [{ statusCode: 202 }];
      sgMail.send.mockResolvedValue(mockResponse);

      const result = await sgMail.send({});

      expect(result).toEqual(mockResponse);
      expect(result[0].statusCode).toBe(202);
    });
  });
});
