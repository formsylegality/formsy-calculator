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

console.log("ENV CHECK:", process.env.EMAIL_USER, process.env.EMAIL_PASS);
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
// ✅ GENERATE PDF ROUTE
// =======================================================

app.post("/generate-pdf", async (req, res) => {
  try {
    console.log("Incoming QuoteNo:", req.body.quoteNo);

    const data = req.body;
    const { quoteNo } = req.body;

    const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"]
});
    const page = await browser.newPage();

    // 🔥 FIX: SET DATA BEFORE PAGE LOAD
    await page.evaluateOnNewDocument((data) => {
      localStorage.setItem("formsyQuote", JSON.stringify(data));
    }, data);

    // 🔥 FIX: LOAD PAGE AFTER DATA
    const htmlContent = `
<html>
  <body>
    <h1>Quotation ${quoteNo}</h1>
    <p>Client: ${input.clientName}</p>
    <p>Total: ₹${result.total}</p>
  </body>
</html>
`;

await page.setContent(htmlContent, {
  waitUntil: "domcontentloaded"
});

    const fileName = `Formsy_${quoteNo}.pdf`;
    const filePath = path.join(__dirname, fileName);

    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true
    });

    await browser.close();

    res.download(filePath, fileName);

  } catch (error) {
    console.error("❌ Error generating PDF:", error);
    res.status(500).send("Error generating PDF");
  }
});


// =======================================================
// ✅ SEND QUOTE ROUTE
// =======================================================

app.post("/send-quote", async (req, res) => {
  try {
    const { input, result, quoteNo } = req.body;
    console.log("FULL BODY:", req.body);
    console.log("SEND HIT");
    console.log("Email:", input?.clientEmail);
    console.log("Quote:", quoteNo);

    const fileName = `Formsy_${quoteNo}_${Date.now()}.pdf`;
    const filePath = path.join(__dirname, fileName);

    const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"]
});
    const page = await browser.newPage();

    // 🔥 FIX: SET DATA BEFORE PAGE LOAD
    await page.evaluateOnNewDocument((data) => {
      localStorage.setItem("formsyQuote", JSON.stringify(data));
    }, req.body);

    // 🔥 FIX: LOAD PAGE AFTER DATA
    const htmlContent = `
<html>
  <body>
    <h1>Quotation ${quoteNo}</h1>
    <p>Client: ${input.clientName}</p>
    <p>Total: ₹${result.total}</p>
  </body>
</html>
`;

await page.setContent(htmlContent, {
  waitUntil: "domcontentloaded"
});
  
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
      subject: `Quotation ${quoteNo} for ${input.companyType} from Formsy`,
      text: `Hi ${input.clientName},

Thank you for your interest in Formsy.

Please find attached the quotation (${quoteNo}) for your requirement.

Total Amount: ₹${result.total}

Best regards,  
Formsy Team`,
      attachments: [
        {
          filename: fileName,
          path: filePath
        }
      ]
    });

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
