const puppeteer = require("puppeteer");
const path = require("path");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new"
  });

  const page = await browser.newPage();

  const data = require("./data.json");

  // ✅ USE EXISTING OR GENERATE
  const quoteNo = data.quoteNo || ("FRM-" + Date.now().toString().slice(-6));

  await page.goto(`file://${path.resolve("./quotation.html")}`, {
    waitUntil: "networkidle0"
  });

  // ✅ SET DATA
  await page.evaluate((data) => {
    localStorage.setItem("formsyQuote", JSON.stringify(data));
  }, data);

  // ✅ WAIT INSTEAD OF RELOAD
  await page.waitForFunction(() => {
    return localStorage.getItem("formsyQuote") !== null;
  });

  // ✅ GENERATE PDF
  await page.pdf({
    path: `Formsy_${quoteNo}.pdf`,
    format: "A4",
    printBackground: true
  });

  await browser.close();

  console.log("✅ PDF Generated:", `Formsy_${quoteNo}.pdf`);
})();