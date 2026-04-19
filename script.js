console.log("JS Loaded");
document.getElementById("calculateBtn").addEventListener("click", () => {
  console.log("Button Clicked");
});
// =======================
// ADDON SELECTION LOGIC
// =======================

let selectedAddons = [];

document.querySelectorAll("[data-addon]").forEach(btn => {
  btn.addEventListener("click", () => {
    const addon = btn.getAttribute("data-addon");

    if (selectedAddons.includes(addon)) {
      // REMOVE
      selectedAddons = selectedAddons.filter(a => a !== addon);

      btn.classList.remove("bg-primary-container/30", "border-primary/30");

    } else {
      // ADD
      selectedAddons.push(addon);

      btn.classList.add("bg-primary-container/30", "border-primary/30");
    }

    console.log("Selected Addons:", selectedAddons);

    // ✅ THIS LINE IS MISSING (ADD THIS)
    autoCalculate();
  });
});


// =======================
// GET INPUT VALUES
// =======================

function getInputValues() {
  const state = document.getElementById("state").value;
  const capital = Number(document.getElementById("capital").value);
  const companyType = document.getElementById("companyType").value;
  const directors = Number(document.getElementById("directors").value);
  const runSelected = document.getElementById("run").checked;
  const clientName = document.getElementById("clientName").value;
  const clientEmail = document.getElementById("clientEmail").value;

  return {
    state,
    capital,
    companyType,
    directors,
    runSelected,
    addonsSelected: selectedAddons,
    clientName,
    clientEmail   
  };
}


// =======================
// CAPITAL SLAB LOGIC
// =======================

function getSlab(capital) {
  if (capital <= 100000) return "1L";
  else if (capital <= 500000) return "5L";
  else if (capital <= 1000000) return "10L";
  else return "15L";
}

// =======================
// CALCULATION ENGINE
// =======================

function calculateCost(input) {

  // TEMP DATA (we will replace later with Google Sheets)
  const stateData = {
    Maharashtra: { "1L": 1000, "5L": 2000, "10L": 3000, "15L": 4000 },
    Delhi: { "1L": 800, "5L": 1500, "10L": 2500, "15L": 3500 },
    Karnataka: { "1L": 1200, "5L": 2200, "10L": 3200, "15L": 4200 }
  };

  const slab = getSlab(input.capital);

  let dataset;

if (input.companyType.includes("LLP")) {
  dataset = llpData;
} else {
  dataset = companyData;
}
console.log("Selected Type:", input.companyType);
console.log("Using Dataset:", dataset === llpData ? "LLP" : "COMPANY");
console.log("State:", input.state);
console.log("Slab:", slab);
console.log("Govt Fees:", dataset[input.state]?.[slab]);

const govtFees = dataset[input.state]?.[slab] || 0;

  // DSC
  const dscCost = input.directors * 2500;

  // RUN
  const runCost = input.runSelected
    ? (input.companyType.includes("LLP") ? 200 : 1000)
    : 0;

  // PROFESSIONAL FEES
  let professionalFees = 2500;

  if (input.companyType.includes("Public") || input.companyType.includes("Subsidiary")) {
    professionalFees = 10000;
  } else if (input.companyType.includes("Section-8")) {
    professionalFees = 5000;
  }

  // ADDONS PRICING
  const filingFee = 143;
  const addonPricing = {
    gst: 1000,
    msme: 1000,
    startup: 6000,
    trademark: 7000,
  };

  let addonsTotal = 0;

  input.addonsSelected.forEach(a => {
    addonsTotal += addonPricing[a] || 0;
  });

  // TOTAL
  const total =
    filingFee+
    govtFees +
    dscCost +
    runCost +
    professionalFees +
    addonsTotal;

  return {
    filingFee,
    govtFees,
    dscCost,
    runCost,
    professionalFees,
    addonsTotal,
    total
  };
}


// =======================
// UPDATE UI
// =======================

function updateUI(result, input) {
  document.getElementById("filingFee").innerText = `₹${result.filingFee}`;
  document.getElementById("govtFees").innerText = `₹${result.govtFees}`;
  document.getElementById("runCost").innerText = `₹${result.runCost}`;
  document.getElementById("dscCost").innerText = `₹${result.dscCost}`;
  document.getElementById("professionalFees").innerText = `₹${result.professionalFees}`;
  document.getElementById("addonsTotal").innerText = `₹${result.addonsTotal}`;
  document.getElementById("total").innerText = `₹${result.total}`;

  // ✅ THIS LINE FIXES YOUR ISSUE
  document.getElementById("dscCount").innerText = input.directors;

}


// =======================
// BUTTON CLICK EVENT
// =======================

document.getElementById("calculateBtn").addEventListener("click", () => {

    // 🛑 CHECK IF DATA LOADED
  if (Object.keys(companyData).length === 0) {
    alert("Data loading... please try again");
    return;
  }

  const input = getInputValues();

  // ✅ ADD THIS LINE HERE
  console.log("Client Name:", input.clientName);

  // ✅ VALIDATION
  if (!input.capital || input.capital <= 0) {
    alert("Please enter capital amount");
    return;
  }

  const result = calculateCost(input);
  updateUI(result, input);
  const existing = JSON.parse(localStorage.getItem("formsyQuote")) || {};

  localStorage.setItem("formsyQuote", JSON.stringify({
    ...existing,
    input,
    result
  }));
});
const runCheckbox = document.getElementById("run");
const toggleCircle = document.getElementById("runToggleCircle");

runCheckbox.addEventListener("change", () => {
  if (runCheckbox.checked) {
    toggleCircle.classList.add("translate-x-5");
  } else {
    toggleCircle.classList.remove("translate-x-5");
  }
});

let companyData = {};
let llpData = {};

// COMMON PARSER
function parseCSV(text) {
  const rows = text.split("\n").slice(1);
  const data = {};

  rows.forEach(row => {
    const cols = row.split(",");

    const state = cols[0]?.trim();
    if (!state) return;

    data[state] = {
      "1L": Number(cols[1]),
      "5L": Number(cols[2]),
      "10L": Number(cols[3]),
      "15L": Number(cols[4])
    };
  });

  return data;
}


// FETCH BOTH SHEETS
async function fetchCSVData() {

  // COMPANY DATA
  const companyRes = await fetch("https://docs.google.com/spreadsheets/d/1nneiCM_zzrpXBVp09XJFiAvuAHVXhphOxl_19z_J4hg/export?format=csv&gid=0");
  const companyText = await companyRes.text();
  companyData = parseCSV(companyText);

  // LLP DATA
  const llpRes = await fetch("https://docs.google.com/spreadsheets/d/1nneiCM_zzrpXBVp09XJFiAvuAHVXhphOxl_19z_J4hg/export?format=csv&gid=498128083");
  const llpText = await llpRes.text();
  llpData = parseCSV(llpText);

  console.log("Company Data:", companyData);
  console.log("LLP Data:", llpData);
}
fetchCSVData().then(() => {
  populateStates();
});
// =======================
// INPUT VALIDATION (CAPITAL)
// =======================

const capitalInput = document.getElementById("capital");

capitalInput.addEventListener("input", () => {
  capitalInput.value = capitalInput.value.replace(/[^0-9]/g, "");

  autoCalculate();
});
function populateStates() {
  const stateDropdown = document.getElementById("state");

  stateDropdown.innerHTML = "";

  // ✅ Default option
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Select State";
  defaultOption.disabled = true;
  defaultOption.selected = true;

  stateDropdown.appendChild(defaultOption);

  Object.keys(companyData).forEach(state => {
    const option = document.createElement("option");
    option.value = state;
    option.textContent = state;

    stateDropdown.appendChild(option);
  });
}
const directorsInput = document.getElementById("directors");
directorsInput.addEventListener("input", () => {
  // Remove non-numeric characters
  directorsInput.value = directorsInput.value.replace(/[^0-9]/g, "");

  autoCalculate(); // keeps real-time calculation working
});
document.querySelectorAll("[data-icon='add']").forEach(btn => {
  btn.addEventListener("click", () => {
    directorsInput.value = Number(directorsInput.value || 0) + 1;
    autoCalculate();
  });
});

document.querySelectorAll("[data-icon='remove']").forEach(btn => {
  btn.addEventListener("click", () => {
    if (Number(directorsInput.value) > 0) {
      directorsInput.value = Number(directorsInput.value) - 1;
      autoCalculate();
    }
  });
});
function autoCalculate() {

  // stop if data not loaded
  if (Object.keys(companyData).length === 0) return;

  const input = getInputValues();

  // stop if capital not entered
  if (!input.capital || input.capital <= 0) return;

  const result = calculateCost(input);

updateUI(result, input);

const existing = JSON.parse(localStorage.getItem("formsyQuote")) || {};

localStorage.setItem("formsyQuote", JSON.stringify({
  ...existing,
  input,
  result
}));
}

// =======================
// AUTO CALCULATION TRIGGERS
// =======================

document.getElementById("state").addEventListener("change", autoCalculate);

document.getElementById("companyType").addEventListener("change", autoCalculate);

document.getElementById("capital").addEventListener("input", autoCalculate);

document.getElementById("directors").addEventListener("input", autoCalculate);

document.getElementById("run").addEventListener("change", autoCalculate);

// =======================
// DOWNLOAD PDF BUTTON
// =======================

document.getElementById("downloadPDF").addEventListener("click", () => {

  const input = getInputValues();

  if (!input.capital || input.capital <= 0) {
    alert("Please enter capital amount");
    return;
  }

  if (!input.clientEmail) {
  alert("Please enter client email");
  return;
  }

  const result = calculateCost(input);
  const quoteNo = "FRM-" + Date.now().toString().slice(-6);
  localStorage.setItem("latestQuote", JSON.stringify({
  input,
  result,
  quoteNo
}));
  // ✅ FORCE SAVE LATEST DATA
  localStorage.setItem("formsyQuote", JSON.stringify({
    input,
    result,
    quoteNo
  }));

  console.log("Saved TOTAL:", result.total); // 👈 ADD THIS

 fetch("http://localhost:3000/generate-pdf", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    input,
    result,
    quoteNo
  })
})
.then(response => {
  const disposition = response.headers.get("Content-Disposition");
  const fileName = disposition
    ? disposition.split("filename=")[1]
    : `Formsy_${quoteNo}.pdf`;

  return response.blob().then(blob => ({ blob, fileName }));
})
.then(({ blob, fileName }) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
});

});
document.getElementById("sendQuote").addEventListener("click", () => {

  // ✅ GET SAVED QUOTE (FROM DOWNLOAD STEP)
  const latest = JSON.parse(localStorage.getItem("latestQuote"));
  const freshInput = getInputValues(); // always get latest email

  if (!latest) {
    alert("Please download & verify the quote first");
    return;
  }

  // 🔥 ensure latest email is present
  latest.input.clientEmail = freshInput.clientEmail;

  console.log("FINAL SEND DATA:", latest);

  if (!latest.input.clientEmail) {
    alert("Email missing. Please enter email.");
    return;
  }

  fetch("http://localhost:3000/send-quote", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(latest)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error("Server error");
    }
    return response.text();
  })
  .then(() => {
    alert("Quote sent successfully");
  })
  .catch((err) => {
    console.error("Send error:", err);
    alert("Error sending quote");
  });
});