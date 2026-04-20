const fs = require("fs");
require("dotenv").config();

const nodemailer = require("nodemailer");
const express = require("express");
const puppeteer = require("puppeteer");
const path = require("path");
const cors = require("cors");

const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ✅ EMAIL TRANSPORTER
const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// =======================================================
// 🔥 COMMON PUPPETEER LAUNCH (REUSABLE)
// =======================================================

async function launchBrowser() {
  try {
    console.log("Launching Puppeteer...");

    return await puppeteer.launch({
      headless: true,
      timeout: 60000,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--single-process"
      ]
    });

  } catch (err) {
    console.log("Retrying Puppeteer launch...");

    return await puppeteer.launch({
      headless: true,
      timeout: 60000,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
  }
}

// =======================================================
// ✅ GENERATE PDF
// =======================================================

app.post("/generate-pdf", async (req, res) => {
  try {
    const data = req.body;
    const { quoteNo } = data;

    if (!data?.input || !data?.result) {
      return res.status(400).send("Invalid request data");
    }

    const browser = await launchBrowser();
    const page = await browser.newPage();

    page.setDefaultNavigationTimeout(0);

    // ✅ LOAD YOUR ORIGINAL HTML (NO CHANGE IN UI)
    const html = fs.readFileSync(
      path.join(__dirname, "quotation.html"),
      "utf8"
    );

    await page.setContent(html, { waitUntil: "domcontentloaded" });

    // ✅ PASS DATA (IMPORTANT)
    await page.evaluate((data) => {
      localStorage.setItem("formsyQuote", JSON.stringify(data));
    }, data);

    // ✅ WAIT FOR RENDER
    await page.waitForSelector(".total-amount");

    const fileName = `Formsy_${quoteNo}.pdf`;
    const filePath = path.join(__dirname, fileName);

    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true
    });

    await browser.close();

    res.download(filePath, fileName, () => {
      fs.unlink(filePath, () => {});
    });

  } catch (error) {
    console.error("❌ Error generating PDF:", error);
    res.status(500).send("Error generating PDF");
  }
});

// =======================================================
// ✅ SEND QUOTE
// =======================================================

app.post("/send-quote", async (req, res) => {
  try {
    const { input, result, quoteNo } = req.body;

    if (!input || !result) {
      return res.status(400).send("Invalid request data");
    }

    const data = req.body;

    const browser = await launchBrowser();
    const page = await browser.newPage();

    page.setDefaultNavigationTimeout(0);

    // ✅ LOAD SAME HTML
    const html = fs.readFileSync(
      path.join(__dirname, "quotation.html"),
      "utf8"
    );

    await page.setContent(html, { waitUntil: "domcontentloaded" });

    // ✅ PASS DATA
    await page.evaluate((data) => {
      localStorage.setItem("formsyQuote", JSON.stringify(data));
    }, data);

    await page.waitForSelector(".total-amount");

    const fileName = `Formsy_${quoteNo}_${Date.now()}.pdf`;
    const filePath = path.join(__dirname, fileName);

    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true
    });

    await browser.close();

    // ✅ EMAIL SEND
    await transporter.sendMail({
      from: '"Formsy" <sales@formsy.in>',
      to: input.clientEmail,
      cc: "formsylegality@gmail.com",
      subject: `Quotation ${quoteNo} for ${input.companyType} from Formsy`,
      text: `Hi ${input.clientName},

Thank you for your interest in Formsy.

Please find attached the quotation (${quoteNo}) for your requirement.

Company Type: ${input.companyType}

Total Amount: ₹${result.total}

If you have any concerns, please reach out to us at +91 8448729780.

Best Regards,  
Team Formsy`,
      attachments: [
        {
          filename: fileName,
          path: filePath
        }
      ]
    });

    fs.unlink(filePath, () => {});

    res.send("Quote sent successfully");

  } catch (error) {
    console.error("❌ Error sending quote:", error);
    res.status(500).send("Error sending quote");
  }
});

// =======================================================
// ✅ START SERVER
// =======================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
