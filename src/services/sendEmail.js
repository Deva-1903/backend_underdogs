const multer = require("multer");
const fs = require("fs");
const sgMail = require("@sendgrid/mail");

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const SENDER_EMAIL = process.env.SENDER_EMAIL || "underdogsfitnessclub@gmail.com";

// Create the multer upload middleware
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage }).single("attachment");

/**
 * Validates email format
 * @param {string} email - Email address to validate
 * @returns {object} - { valid: boolean, email: string, error: string }
 */
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

/**
 * Sends invoice email with PDF attachment using SendGrid
 */
exports.sendInvoice = async (req, res) => {
  try {
    upload(req, res, async (err) => {
      if (err) {
        console.error("Error uploading file:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to upload file.",
          error: err.message,
        });
      }

      const { email, action, invoice_id, user_name } = req.body;
      const attachment = req.file;

      // Validate email
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        return res.status(400).json({
          success: false,
          message: emailValidation.error,
        });
      }

      // Validate attachment
      if (!attachment) {
        return res.status(400).json({
          success: false,
          message: "No invoice PDF attached",
        });
      }

      // Check SendGrid configuration
      if (!process.env.SENDGRID_API_KEY) {
        console.error("SendGrid API key not configured");
        return res.status(500).json({
          success: false,
          message: "Email service not configured. Contact support.",
        });
      }

      // Generate subject and text based on action
      let subject = "";
      let text = "";

      if (action === "register") {
        subject = `Welcome to UnderDogs Fitness Club - Invoice ${invoice_id}`;
        text = `
Dear ${user_name},

Thank you for registering at UnderDogs Fitness Club! We are thrilled to have you as a new member. Attached is the invoice for your membership. If you have any questions or need assistance, please don't hesitate to reach out to our friendly team.

We look forward to seeing you at our gym soon!

Website: https://www.underdogsfitness.in/
Contact/WhatsApp: +91 91235 25358 / +91 63822 32050

Best regards,
UnderDogs Fitness Club
        `;
      } else if (action === "updateSubscription") {
        subject = `UnderDogs Fitness Club Subscription Update - Invoice ${invoice_id}`;
        text = `
Dear ${user_name},

We are excited to inform you that your gym subscription at UnderDogs Fitness Club has been updated. Attached is the updated invoice reflecting the changes. If you have any questions regarding your subscription or need further assistance, please feel free to contact our team.

Thank you for choosing UnderDogs Fitness Club as your fitness partner!

Website: https://www.underdogsfitness.in/
Contact/WhatsApp: +91 91235 25358 / +91 63822 32050

Best regards,
UnderDogs Fitness Club
        `;
      } else {
        subject = `Invoice ${invoice_id}`;
        text = `
Dear ${user_name},

We hope this email finds you well. Please find attached the invoice for your recent transaction. If you require any clarification or have any concerns, don't hesitate to reach out to us. We appreciate your continued support.

Website: https://www.underdogsfitness.in/
Contact/WhatsApp: +91 91235 25358 / +91 63822 32050

Thank you,
UnderDogs Fitness Club
        `;
      }

      try {
        // Read the attachment file
        const attachmentData = fs.readFileSync(attachment.path);

        // Prepare email message
        const message = {
          to: emailValidation.email,
          from: SENDER_EMAIL,
          subject: subject,
          text: text,
          attachments: [
            {
              content: attachmentData.toString("base64"),
              filename: attachment.originalname,
              type: attachment.mimetype,
              disposition: "attachment",
            },
          ],
        };

        // Send email via SendGrid
        const result = await sgMail.send(message);

        console.log(`✓ Invoice ${invoice_id} sent to ${emailValidation.email}`);

        res.json({
          success: true,
          message: "Invoice sent successfully!",
          emailSent: emailValidation.email,
          invoiceId: invoice_id,
        });

        // Delete the file from the uploads folder
        fs.unlink(attachment.path, (err) => {
          if (err) {
            console.error("Error deleting file:", err);
          }
        });
      } catch (error) {
        console.error("SendGrid Error:", {
          invoice_id,
          email: emailValidation.email,
          code: error.code,
          message: error.message,
          response: error.response?.body,
        });

        // Provide specific error messages
        let userMessage = "Failed to send invoice.";

        if (error.code === 401 || error.code === 403) {
          userMessage = "Email service authentication failed. Please check API key.";
        } else if (error.code === 400) {
          userMessage = "Invalid email address or rejected by email server.";
        } else if (error.response?.body?.errors) {
          userMessage = error.response.body.errors[0]?.message || userMessage;
        }

        // Delete the file even if sending failed
        fs.unlink(attachment.path, (unlinkErr) => {
          if (unlinkErr) {
            console.error("Error deleting file after failed send:", unlinkErr);
          }
        });

        res.status(500).json({
          success: false,
          message: userMessage,
          technicalDetails:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }
    });
  } catch (error) {
    console.error("Error in sendInvoice handler:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process the invoice request.",
    });
  }
};
