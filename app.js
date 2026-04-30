const STORAGE_KEY = "taxriseAssetManagementEmployees";
const WORK_LOCATIONS = ["CA", "TX", "FL"];
const createId = () =>
  globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const seedEmployees = [
  {
    id: createId(),
    employeeId: "TR-1042",
    fullName: "Avery Martinez",
    workLocation: "CA",
    address: {
      address1: "1200 Wilshire Blvd",
      address2: "Apt 4B",
      city: "Los Angeles",
      state: "CA",
      zip: "90017",
    },
    assets: [
      {
        id: createId(),
        equipmentName: "MacBook Pro 14",
        serialNumber: "C02TR1042MBP",
        unitPrice: 2199,
        quantity: 1,
      },
      {
        id: createId(),
        equipmentName: "Dell UltraSharp Monitor",
        serialNumber: "MON-77821",
        unitPrice: 429,
        quantity: 2,
      },
    ],
    status: "active",
    terminationDate: "",
    returnDueDate: "",
    trackingNumber: "",
  },
  {
    id: createId(),
    employeeId: "TR-1188",
    fullName: "Jordan Lee",
    workLocation: "TX",
    address: {
      address1: "402 Congress Ave",
      address2: "",
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
    assets: [
      {
        id: createId(),
        equipmentName: "Lenovo ThinkPad X1",
        serialNumber: "PF-30TX1188",
        unitPrice: 1650,
        quantity: 1,
      },
    ],
    status: "pending-return",
    terminationDate: "2026-04-16",
    returnDueDate: "2026-04-26",
    trackingNumber: "1Z999AA10123456784",
  },
];

let employees = loadEmployees();
let selectedEmployeeId = null;

const openEmployeeFormButton = document.querySelector("#openEmployeeForm");
const openEmployeeFormSecondaryButton = document.querySelector("#openEmployeeFormSecondary");
const employeeDialog = document.querySelector("#employeeDialog");
const employeeForm = document.querySelector("#employeeForm");
const assetRows = document.querySelector("#assetRows");
const addAssetRowButton = document.querySelector("#addAssetRow");
const activeEmployeesTable = document.querySelector("#activeEmployeesTable");
const pendingReturnTable = document.querySelector("#pendingReturnTable");
const activeEmptyState = document.querySelector("#activeEmptyState");
const pendingEmptyState = document.querySelector("#pendingEmptyState");
const activeEmployeeCount = document.querySelector("#activeEmployeeCount");
const lentAssetCount = document.querySelector("#lentAssetCount");
const pendingReturnCount = document.querySelector("#pendingReturnCount");
const overdueCount = document.querySelector("#overdueCount");
const profileDialog = document.querySelector("#profileDialog");
const profileName = document.querySelector("#profileName");
const profileContent = document.querySelector("#profileContent");
const returnDialog = document.querySelector("#returnDialog");
const returnEmployeeName = document.querySelector("#returnEmployeeName");
const returnForm = document.querySelector("#returnForm");
const terminationDateInput = returnForm.elements.terminationDate;
const toast = document.querySelector("#toast");

openEmployeeFormButton.addEventListener("click", openEmployeeDialog);
openEmployeeFormSecondaryButton.addEventListener("click", openEmployeeDialog);
addAssetRowButton.addEventListener("click", () => addAssetRow());
employeeForm.addEventListener("submit", handleEmployeeSubmit);
returnForm.addEventListener("submit", handleReturnSubmit);

document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(`#${button.dataset.closeDialog}`).close();
  });
});

document.addEventListener("click", (event) => {
  const actionButton = event.target.closest("[data-action]");

  if (!actionButton) {
    return;
  }

  const employeeId = actionButton.dataset.employeeId;
  const action = actionButton.dataset.action;

  if (action === "view-profile") {
    openProfileModal(employeeId);
  }

  if (action === "start-return") {
    openReturnModal(employeeId);
  }
});

document.addEventListener("input", (event) => {
  const input = event.target;

  if (!input.matches("[data-action='update-tracking']")) {
    return;
  }

  const employee = employees.find((item) => item.id === input.dataset.employeeId);

  if (!employee) {
    return;
  }

  employee.trackingNumber = input.value.trim();
  saveEmployees();
});

[employeeDialog, profileDialog, returnDialog].forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
});

render();

function loadEmployees() {
  const savedEmployees = localStorage.getItem(STORAGE_KEY);

  if (!savedEmployees) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedEmployees));
    return seedEmployees;
  }

  try {
    const parsedEmployees = JSON.parse(savedEmployees);
    return Array.isArray(parsedEmployees) ? parsedEmployees : [];
  } catch {
    return [];
  }
}

function saveEmployees() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
}

function render() {
  const activeEmployees = employees.filter((employee) => employee.status === "active");
  const pendingEmployees = employees.filter((employee) => employee.status === "pending-return");

  activeEmployeeCount.textContent = String(activeEmployees.length);
  lentAssetCount.textContent = String(getTotalAssetQuantity(activeEmployees));
  pendingReturnCount.textContent = String(getTotalAssetQuantity(pendingEmployees));
  overdueCount.textContent = String(pendingEmployees.filter((employee) => isPastDue(employee.returnDueDate)).length);

  renderActiveEmployees(activeEmployees);
  renderPendingEmployees(pendingEmployees);
}

function renderActiveEmployees(activeEmployees) {
  activeEmployeesTable.innerHTML = "";
  activeEmptyState.hidden = activeEmployees.length > 0;

  activeEmployees.forEach((employee) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${escapeHtml(employee.employeeId)}</strong></td>
      <td>${escapeHtml(employee.fullName)}</td>
      <td><span class="location-pill">${escapeHtml(employee.workLocation)}</span></td>
      <td>${getAssetQuantity(employee)}</td>
      <td>
        <button class="table-action" type="button" data-action="view-profile" data-employee-id="${employee.id}">
          View Profile
        </button>
      </td>
      <td>
        <button class="table-action danger" type="button" data-action="start-return" data-employee-id="${employee.id}">
          Start Return
        </button>
      </td>
    `;
    activeEmployeesTable.append(row);
  });
}

function renderPendingEmployees(pendingEmployees) {
  pendingReturnTable.innerHTML = "";
  pendingEmptyState.hidden = pendingEmployees.length > 0;

  pendingEmployees.forEach((employee) => {
    const isOverdue = isPastDue(employee.returnDueDate);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${escapeHtml(employee.employeeId)}</strong></td>
      <td>${escapeHtml(employee.fullName)}</td>
      <td>${getAssetQuantity(employee)}</td>
      <td>
        <span class="due-date ${isOverdue ? "overdue" : ""}">
          ${formatDate(employee.returnDueDate)}
        </span>
      </td>
      <td>
        <input
          class="tracking-input"
          data-action="update-tracking"
          data-employee-id="${employee.id}"
          aria-label="UPS tracking number for ${escapeHtml(employee.fullName)}"
          placeholder="Enter UPS tracking"
          value="${escapeAttribute(employee.trackingNumber || "")}"
        />
      </td>
      <td>
        <button class="table-action" type="button" data-action="view-profile" data-employee-id="${employee.id}">
          View Profile
        </button>
      </td>
    `;
    pendingReturnTable.append(row);
  });
}

function openEmployeeDialog() {
  employeeForm.reset();
  assetRows.innerHTML = "";
  addAssetRow();
  employeeDialog.showModal();
  employeeForm.elements.employeeId.focus();
}

function addAssetRow(asset = {}) {
  const row = document.createElement("div");
  row.className = "asset-row";
  row.innerHTML = `
    <label>
      <span>Equipment name</span>
      <input name="equipmentName" required placeholder="MacBook Pro" value="${escapeAttribute(asset.equipmentName || "")}" />
    </label>
    <label>
      <span>Serial number <em>(if applicable)</em></span>
      <input name="serialNumber" placeholder="Serial number" value="${escapeAttribute(asset.serialNumber || "")}" />
    </label>
    <label>
      <span>Unit price</span>
      <input name="unitPrice" required min="0" step="0.01" type="number" placeholder="0.00" value="${asset.unitPrice || ""}" />
    </label>
    <label>
      <span>Quantity</span>
      <input name="quantity" required min="1" step="1" type="number" value="${asset.quantity || 1}" />
    </label>
    <button class="icon-button remove-asset" type="button" aria-label="Remove asset">Remove</button>
  `;

  row.querySelector(".remove-asset").addEventListener("click", () => {
    if (assetRows.children.length === 1) {
      showToast("At least one asset is required.");
      return;
    }

    row.remove();
  });

  assetRows.append(row);
}

function handleEmployeeSubmit(event) {
  event.preventDefault();
  const formData = new FormData(employeeForm);
  const employeeId = String(formData.get("employeeId")).trim();

  if (employees.some((employee) => employee.employeeId.toLowerCase() === employeeId.toLowerCase())) {
    showToast("That employee ID already exists.");
    return;
  }

  const assetRowElements = [...assetRows.querySelectorAll(".asset-row")];
  const assets = assetRowElements.map((row) => ({
    id: createId(),
    equipmentName: row.querySelector("[name='equipmentName']").value.trim(),
    serialNumber: row.querySelector("[name='serialNumber']").value.trim(),
    unitPrice: Number(row.querySelector("[name='unitPrice']").value),
    quantity: Number(row.querySelector("[name='quantity']").value),
  }));

  const employee = {
    id: createId(),
    employeeId,
    fullName: String(formData.get("fullName")).trim(),
    workLocation: String(formData.get("workLocation")),
    address: {
      address1: String(formData.get("address1")).trim(),
      address2: String(formData.get("address2")).trim(),
      city: String(formData.get("city")).trim(),
      state: String(formData.get("state")).trim().toUpperCase(),
      zip: String(formData.get("zipCode")).trim(),
    },
    assets,
    status: "active",
    terminationDate: "",
    returnDueDate: "",
    trackingNumber: "",
  };

  employees = [employee, ...employees];
  saveEmployees();
  render();
  employeeDialog.close();
  openProfileModal(employee.id);
  showToast("Employee asset profile created.");
}

function openProfileModal(employeeId) {
  const employee = employees.find((item) => item.id === employeeId);

  if (!employee) {
    return;
  }

  const totalValue = employee.assets.reduce(
    (total, asset) => total + Number(asset.unitPrice) * Number(asset.quantity),
    0,
  );

  profileName.textContent = employee.fullName;
  profileContent.innerHTML = `
    <div class="profile-header">
      <div>
        <p class="eyebrow">Full Asset Profile</p>
        <h2>${escapeHtml(employee.fullName)}</h2>
        <p>${escapeHtml(employee.employeeId)} • ${escapeHtml(employee.workLocation)} • ${formatStatus(employee.status)}</p>
      </div>
      <div class="profile-value">
        <span>Total Asset Value</span>
        <strong>${formatCurrency(totalValue)}</strong>
      </div>
    </div>
    <div class="profile-grid">
      <section>
        <h3>Employee Details</h3>
        <dl>
          <div><dt>Employee ID</dt><dd>${escapeHtml(employee.employeeId)}</dd></div>
          <div><dt>Full name</dt><dd>${escapeHtml(employee.fullName)}</dd></div>
          <div><dt>Work location</dt><dd>${escapeHtml(employee.workLocation)}</dd></div>
          ${
            employee.terminationDate
              ? `<div><dt>Termination date</dt><dd>${formatDate(employee.terminationDate)}</dd></div>
                 <div><dt>Return due date</dt><dd>${formatDate(employee.returnDueDate)}</dd></div>`
              : ""
          }
        </dl>
      </section>
      <section>
        <h3>Mailing Address</h3>
        <address>
          ${escapeHtml(employee.address.address1)}<br />
          ${employee.address.address2 ? `${escapeHtml(employee.address.address2)}<br />` : ""}
          ${escapeHtml(employee.address.city)}, ${escapeHtml(employee.address.state)} ${escapeHtml(employee.address.zip)}
        </address>
      </section>
    </div>
    <section>
      <h3>Assigned Assets (${getAssetQuantity(employee)})</h3>
      <div class="asset-cards">
        ${employee.assets
          .map(
            (asset) => `
              <article class="asset-card">
                <h4>${escapeHtml(asset.equipmentName)}</h4>
                <p>Serial: ${escapeHtml(asset.serialNumber || "N/A")}</p>
                <div>
                  <span>${formatCurrency(Number(asset.unitPrice))} each</span>
                  <strong>Qty ${Number(asset.quantity)}</strong>
                </div>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;

  profileDialog.showModal();
}

function openReturnModal(employeeId) {
  const employee = employees.find((item) => item.id === employeeId);

  if (!employee) {
    return;
  }

  selectedEmployeeId = employeeId;
  returnForm.reset();
  returnForm.elements.employeeId.value = employeeId;
  returnEmployeeName.textContent = `${employee.fullName} (${employee.employeeId})`;
  returnDialog.showModal();
  terminationDateInput.focus();
}

function handleReturnSubmit(event) {
  event.preventDefault();

  const employee = employees.find((item) => item.id === selectedEmployeeId);

  if (!employee || !terminationDateInput.value) {
    return;
  }

  employee.status = "pending-return";
  employee.terminationDate = terminationDateInput.value;
  employee.returnDueDate = addCalendarDays(terminationDateInput.value, 10);
  employee.trackingNumber = employee.trackingNumber || "";

  saveEmployees();
  render();
  returnDialog.close();
  selectedEmployeeId = null;
  showToast("Return process started.");
}

function getAssetQuantity(employee) {
  return employee.assets.reduce((total, asset) => total + Number(asset.quantity), 0);
}

function getTotalAssetQuantity(employeeList) {
  return employeeList.reduce((total, employee) => total + getAssetQuantity(employee), 0);
}

function addCalendarDays(dateValue, days) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function isPastDue(dateValue) {
  if (!dateValue) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${dateValue}T00:00:00`) < today;
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateValue}T00:00:00`));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatStatus(status) {
  return status === "pending-return" ? "Assets Pending Return" : "Employees With Assets";
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    toast.hidden = true;
  }, 2800);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
