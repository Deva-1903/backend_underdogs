const multer = require("multer");
const fs = require("fs");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
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

exports.sendInvoice = async (req, res) => {
  try {
    upload(req, res, async (err) => {
      if (err) {
        console.error("Error uploading file:", err);
        res.status(500).json({ message: "Failed to upload file." });
        return;
      }

      const { email, action, invoice_id, user_name } = req.body;
      const attachment = req.file;

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
UnderDogs Fitness Club      `;
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

We hope this email finds you well. Please find attached the invoice for your recent transaction/action. If you require any clarification or have any concerns, don't hesitate to reach out to us. We appreciate your continued support.

Website: https://www.underdogsfitness.in/
Contact/WhatsApp: +91 91235 25358 / +91 63822 32050

Thank you,
UnderDogs Fitness Club
        `;
      }

      const attachmentData = await new Promise((resolve, reject) => {
        fs.readFile(attachment.path, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });

      const attachmentName = attachment.originalname;
      const attachmentType = attachment.mimetype;

      const message = {
        to: email,
        from: "underdogsfitnessclub@gmail.com",
        subject: subject,
        text: text,
        attachments: [
          {
            content: attachmentData.toString("base64"),
            filename: attachmentName,
            type: attachmentType,
            disposition: "attachment",
          },
        ],
      };

      try {
        await sgMail.send(message);
        res.json({ message: "Invoice sent successfully!" });

        // Delete the file from the uploads folder
        fs.unlink(attachment.path, (err) => {
          if (err) {
            console.error("Error deleting file:", err);
          }
        });
      } catch (error) {
        console.error("Error sending invoice:", error);
        res.status(500).json({ message: "Failed to send invoice." });
      }
    });
  } catch (error) {
    console.error('Error importing "formidable":', error);
    res.status(500).json({ message: "Failed to process the form data." });
  }
};