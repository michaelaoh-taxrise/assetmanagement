const STORAGE_KEY = "taxriseAssetManagementEmployees";
const ASSET_STATUS = {
  ISSUED: "issued",
  RETURNED: "returned",
};
const TRACKING_STATUSES = ["Pending pickup", "On the way", "Delivered"];
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
        status: ASSET_STATUS.ISSUED,
      },
      {
        id: createId(),
        equipmentName: "Dell UltraSharp Monitor",
        serialNumber: "MON-77821",
        unitPrice: 429,
        quantity: 2,
        status: ASSET_STATUS.ISSUED,
      },
    ],
    status: "active",
    terminationDate: "",
    returnDueDate: "",
    trackingNumber: "",
    archivedDate: "",
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
        status: ASSET_STATUS.ISSUED,
      },
    ],
    status: "pending-return",
    terminationDate: "2026-04-16",
    returnDueDate: "2026-04-26",
    trackingNumber: "1Z999AA10123456784",
    trackingStatus: "On the way",
    archivedDate: "",
  },
];

let employees = loadEmployees();
let selectedEmployeeId = null;
let editingEmployeeId = null;
let searchTerm = "";

const openEmployeeFormButton = document.querySelector("#openEmployeeForm");
const openEmployeeFormSecondaryButton = document.querySelector("#openEmployeeFormSecondary");
const employeeDialog = document.querySelector("#employeeDialog");
const employeeDialogTitle = document.querySelector("#employeeDialogTitle");
const employeeDialogEyebrow = document.querySelector("#employeeDialogEyebrow");
const employeeForm = document.querySelector("#employeeForm");
const employeeSubmitButton = document.querySelector("#employeeSubmitButton");
const assetRows = document.querySelector("#assetRows");
const addAssetRowButton = document.querySelector("#addAssetRow");
const searchInput = document.querySelector("#searchInput");
const clearSearchButton = document.querySelector("#clearSearch");
const activeEmployeesTable = document.querySelector("#activeEmployeesTable");
const pendingReturnTable = document.querySelector("#pendingReturnTable");
const archivedEmployeesTable = document.querySelector("#archivedEmployeesTable");
const assetInventoryTable = document.querySelector("#assetInventoryTable");
const activeEmptyState = document.querySelector("#activeEmptyState");
const pendingEmptyState = document.querySelector("#pendingEmptyState");
const archivedEmptyState = document.querySelector("#archivedEmptyState");
const assetInventoryEmptyState = document.querySelector("#assetInventoryEmptyState");
const activeEmployeeCount = document.querySelector("#activeEmployeeCount");
const lentAssetCount = document.querySelector("#lentAssetCount");
const pendingReturnCount = document.querySelector("#pendingReturnCount");
const overdueCount = document.querySelector("#overdueCount");
const archivedEmployeeCount = document.querySelector("#archivedEmployeeCount");
const archivedAssetCount = document.querySelector("#archivedAssetCount");
const companyAssetCount = document.querySelector("#companyAssetCount");
const companyIssuedCount = document.querySelector("#companyIssuedCount");
const companyAvailableCount = document.querySelector("#companyAvailableCount");
const inventoryValue = document.querySelector("#inventoryValue");
const companyAssetsTable = document.querySelector("#companyAssetsTable");
const companyAssetsEmptyState = document.querySelector("#companyAssetsEmptyState");
const profileDialog = document.querySelector("#profileDialog");
const profileContent = document.querySelector("#profileContent");
const assetDetailsDialog = document.querySelector("#assetDetailsDialog");
const assetDetailsTitle = document.querySelector("#assetDetailsTitle");
const assetDetailsContent = document.querySelector("#assetDetailsContent");
const returnDialog = document.querySelector("#returnDialog");
const returnEmployeeName = document.querySelector("#returnEmployeeName");
const returnForm = document.querySelector("#returnForm");
const terminationDateInput = returnForm?.elements.terminationDate;
const toast = document.querySelector("#toast");
const isArchivePage = document.body.dataset.page === "archive";
const isAssetsPage = document.body.dataset.page === "assets";

openEmployeeFormButton?.addEventListener("click", () => openEmployeeDialog());
openEmployeeFormSecondaryButton?.addEventListener("click", () => openEmployeeDialog());
addAssetRowButton.addEventListener("click", () => addAssetRow());
employeeForm.addEventListener("submit", handleEmployeeSubmit);
returnForm?.addEventListener("submit", handleReturnSubmit);
searchInput?.addEventListener("input", (event) => {
  searchTerm = event.target.value.trim().toLowerCase();
  render();
});
clearSearchButton?.addEventListener("click", () => {
  searchInput.value = "";
  searchTerm = "";
  render();
  searchInput.focus();
});

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

  if (action === "edit-employee") {
    openEmployeeDialog(employeeId);
  }

  if (action === "start-return") {
    openReturnModal(employeeId);
  }

  if (action === "archive-employee") {
    archiveEmployee(employeeId);
  }

  if (action === "update-asset-status") {
    updateAssetStatus(employeeId, actionButton.dataset.assetId, actionButton.dataset.assetStatus);
  }

  if (action === "view-asset-details") {
    openAssetDetails(actionButton.dataset.equipmentName);
  }

  if (action === "delete-employee") {
    deleteEmployee(employeeId);
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
  render();
});

document.addEventListener("change", (event) => {
  const input = event.target;

  if (input.matches("[data-action='update-tracking-status']")) {
    const employee = employees.find((item) => item.id === input.dataset.employeeId);

    if (!employee) {
      return;
    }

    employee.trackingStatus = input.value;
    saveEmployees();
    render();
  }
});

[employeeDialog, profileDialog, returnDialog, assetDetailsDialog].filter(Boolean).forEach((dialog) => {
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
    return Array.isArray(parsedEmployees) ? parsedEmployees.map(normalizeEmployee) : [];
  } catch {
    return [];
  }
}

function normalizeEmployee(employee) {
  return {
    ...employee,
    status: employee.status || "active",
    trackingNumber: employee.trackingNumber || "",
    trackingStatus: employee.trackingStatus || "",
    terminationDate: employee.terminationDate || "",
    returnDueDate: employee.returnDueDate || "",
    archivedDate: employee.archivedDate || "",
    address: {
      address1: employee.address?.address1 || "",
      address2: employee.address?.address2 || "",
      city: employee.address?.city || "",
      state: employee.address?.state || "",
      zip: employee.address?.zip || "",
    },
    assets: Array.isArray(employee.assets)
      ? employee.assets.map((asset) => ({
          ...asset,
          id: asset.id || createId(),
          status: asset.status || ASSET_STATUS.ISSUED,
        }))
      : [],
  };
}

function saveEmployees() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
}

function render() {
  const activeEmployees = employees.filter((employee) => employee.status === "active");
  const pendingEmployees = employees.filter((employee) => employee.status === "pending-return");
  const archivedEmployees = employees.filter((employee) => employee.status === "archived");
  const inventory = getAssetInventory();

  if (isAssetsPage) {
    const filteredInventory = filterInventory(inventory);
    const totals = getInventoryTotals(inventory);

    companyAssetCount.textContent = String(totals.total);
    companyIssuedCount.textContent = String(totals.issued);
    companyAvailableCount.textContent = String(totals.available);
    renderCompanyAssets(filteredInventory);
    return;
  }

  if (isArchivePage) {
    archivedEmployeeCount.textContent = String(archivedEmployees.length);
    archivedAssetCount.textContent = String(getTotalAssetQuantity(archivedEmployees));
    renderArchivedEmployees(filterEmployees(archivedEmployees));
    return;
  }

  activeEmployeeCount.textContent = String(activeEmployees.length);
  lentAssetCount.textContent = String(getIssuedAssetQuantity(activeEmployees));
  pendingReturnCount.textContent = String(getIssuedAssetQuantity(pendingEmployees));
  overdueCount.textContent = String(pendingEmployees.filter((employee) => isPastDue(employee.returnDueDate)).length);

  renderActiveEmployees(filterEmployees(activeEmployees));
  renderPendingEmployees(filterEmployees(pendingEmployees));
}

function renderActiveEmployees(activeEmployees) {
  if (!activeEmployeesTable) {
    return;
  }

  activeEmployeesTable.innerHTML = "";
  activeEmptyState.hidden = activeEmployees.length > 0;
  activeEmptyState.textContent = searchTerm
    ? "No active employees match your search."
    : "No active asset assignments yet. Add a new employee to get started.";

  activeEmployees.forEach((employee) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${escapeHtml(employee.employeeId)}</strong></td>
      <td>${escapeHtml(employee.fullName)}</td>
      <td><span class="location-pill">${escapeHtml(employee.workLocation)}</span></td>
      <td>${getIssuedAssetQuantity([employee])}</td>
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
  if (!pendingReturnTable) {
    return;
  }

  pendingReturnTable.innerHTML = "";
  pendingEmptyState.hidden = pendingEmployees.length > 0;
  pendingEmptyState.textContent = searchTerm
    ? "No pending returns match your search."
    : "No employees are currently pending asset returns.";

  pendingEmployees.forEach((employee) => {
    const isOverdue = isPastDue(employee.returnDueDate);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${escapeHtml(employee.employeeId)}</strong></td>
      <td>${escapeHtml(employee.fullName)}</td>
      <td>${getIssuedAssetQuantity([employee])}</td>
      <td>
        <span class="due-date ${isOverdue ? "overdue" : ""}">
          ${formatDate(employee.returnDueDate)}
        </span>
      </td>
      <td>${renderTrackingCell(employee)}</td>
      <td>
        <button class="table-action success" type="button" data-action="archive-employee" data-employee-id="${employee.id}">
          Archive
        </button>
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

function renderArchivedEmployees(archivedEmployees) {
  if (!archivedEmployeesTable) {
    return;
  }

  archivedEmployeesTable.innerHTML = "";
  archivedEmptyState.hidden = archivedEmployees.length > 0;
  archivedEmptyState.textContent = searchTerm
    ? "No archived employees match your search."
    : "No returned asset profiles have been archived yet.";

  archivedEmployees.forEach((employee) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${escapeHtml(employee.employeeId)}</strong></td>
      <td>${escapeHtml(employee.fullName)}</td>
      <td><span class="location-pill">${escapeHtml(employee.workLocation)}</span></td>
      <td>${getAssetQuantity(employee)}</td>
      <td>${formatDate(employee.archivedDate)}</td>
      <td>
        <button class="table-action" type="button" data-action="view-profile" data-employee-id="${employee.id}">
          View Profile
        </button>
      </td>
    `;
    archivedEmployeesTable.append(row);
  });
}

function renderCompanyAssets(inventoryItems) {
  if (!companyAssetsTable) {
    return;
  }

  companyAssetsTable.innerHTML = "";
  companyAssetsEmptyState.hidden = inventoryItems.length > 0;
  companyAssetsEmptyState.textContent = searchTerm
    ? "No company assets match your search."
    : "No company assets have been added yet.";

  inventoryItems.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${escapeHtml(item.equipmentName)}</strong></td>
      <td>${item.quantityIssued}</td>
      <td>${item.quantityAvailable}</td>
      <td>
        <button
          class="table-action"
          type="button"
          data-action="view-asset-details"
          data-equipment-name="${escapeAttribute(item.equipmentName)}"
        >
          Expand
        </button>
      </td>
    `;
    companyAssetsTable.append(row);
  });
}

function renderTrackingCell(employee) {
  const trackingNumber = employee.trackingNumber || "";
  const trackingLink = trackingNumber ? getUpsTrackingUrl(trackingNumber) : "";
  const trackingStatus = employee.trackingStatus || "";

  return `
    <div class="tracking-control">
      <input
        class="tracking-input"
        data-action="update-tracking"
        data-employee-id="${employee.id}"
        aria-label="UPS tracking number for ${escapeAttribute(employee.fullName)}"
        placeholder="Enter UPS tracking"
        value="${escapeAttribute(trackingNumber)}"
      />
      <select
        class="tracking-status-select"
        data-action="update-tracking-status"
        data-employee-id="${employee.id}"
        aria-label="UPS delivery status for ${escapeAttribute(employee.fullName)}"
      >
        <option value="">Delivery status</option>
        ${TRACKING_STATUSES.map(
          (status) =>
            `<option value="${escapeAttribute(status)}" ${trackingStatus === status ? "selected" : ""}>${escapeHtml(status)}</option>`,
        ).join("")}
      </select>
      ${
        trackingLink
          ? `<a class="tracking-link" href="${trackingLink}" target="_blank" rel="noopener noreferrer">Track UPS</a>`
          : ""
      }
    </div>
  `;
}

function openEmployeeDialog(employeeId = null) {
  const employee = employeeId ? employees.find((item) => item.id === employeeId) : null;
  editingEmployeeId = employee?.id || null;

  employeeForm.reset();
  assetRows.innerHTML = "";

  employeeDialogEyebrow.textContent = employee ? "Edit asset profile" : "New asset profile";
  employeeDialogTitle.textContent = employee ? "Edit Employee Profile" : "Add New Employee";
  employeeSubmitButton.textContent = employee ? "Save Profile Updates" : "Generate Full Asset Profile";

  if (employee) {
    employeeForm.elements.employeeId.value = employee.employeeId;
    employeeForm.elements.fullName.value = employee.fullName;
    employeeForm.elements.workLocation.value = employee.workLocation;
    employeeForm.elements.address1.value = employee.address.address1;
    employeeForm.elements.address2.value = employee.address.address2;
    employeeForm.elements.city.value = employee.address.city;
    employeeForm.elements.state.value = employee.address.state;
    employeeForm.elements.zipCode.value = employee.address.zip;
    employee.assets.forEach((asset) => addAssetRow(asset));
  } else {
    addAssetRow();
  }

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
    <label>
      <span>Status</span>
      <select name="assetStatus" required>
        <option value="${ASSET_STATUS.ISSUED}" ${(asset.status || ASSET_STATUS.ISSUED) === ASSET_STATUS.ISSUED ? "selected" : ""}>Issued</option>
        <option value="${ASSET_STATUS.RETURNED}" ${asset.status === ASSET_STATUS.RETURNED ? "selected" : ""}>Returned</option>
      </select>
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
  const existingEmployee = editingEmployeeId
    ? employees.find((employee) => employee.id === editingEmployeeId)
    : null;

  const duplicateEmployeeId = employees.some(
    (employee) =>
      employee.id !== editingEmployeeId && employee.employeeId.toLowerCase() === employeeId.toLowerCase(),
  );

  if (duplicateEmployeeId) {
    showToast("That employee ID already exists.");
    return;
  }

  const assetRowElements = [...assetRows.querySelectorAll(".asset-row")];
  const assets = assetRowElements.map((row, index) => {
    const previousAsset = existingEmployee?.assets[index];

    return {
      id: previousAsset?.id || createId(),
      equipmentName: row.querySelector("[name='equipmentName']").value.trim(),
      serialNumber: row.querySelector("[name='serialNumber']").value.trim(),
      unitPrice: Number(row.querySelector("[name='unitPrice']").value),
      quantity: Number(row.querySelector("[name='quantity']").value),
      status: row.querySelector("[name='assetStatus']").value,
    };
  });

  const updatedEmployee = {
    id: existingEmployee?.id || createId(),
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
    status: existingEmployee?.status || "active",
    terminationDate: existingEmployee?.terminationDate || "",
    returnDueDate: existingEmployee?.returnDueDate || "",
    trackingNumber: existingEmployee?.trackingNumber || "",
    trackingStatus: existingEmployee?.trackingStatus || "",
    archivedDate: existingEmployee?.archivedDate || "",
  };

  if (existingEmployee) {
    employees = employees.map((employee) => (employee.id === existingEmployee.id ? updatedEmployee : employee));
  } else {
    employees = [updatedEmployee, ...employees];
  }

  saveEmployees();
  render();
  employeeDialog.close();
  editingEmployeeId = null;
  openProfileModal(updatedEmployee.id);
  showToast(existingEmployee ? "Employee asset profile updated." : "Employee asset profile created.");
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

  profileContent.innerHTML = `
    <div class="profile-header">
      <div>
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
          ${
            employee.archivedDate
              ? `<div><dt>Archived date</dt><dd>${formatDate(employee.archivedDate)}</dd></div>`
              : ""
          }
          ${
            employee.trackingNumber
              ? `<div><dt>UPS tracking</dt><dd><a href="${getUpsTrackingUrl(employee.trackingNumber)}" target="_blank" rel="noopener noreferrer">${escapeHtml(employee.trackingNumber)}</a></dd></div>`
              : ""
          }
          ${
            employee.trackingStatus
              ? `<div><dt>Delivery status</dt><dd>${escapeHtml(employee.trackingStatus)}</dd></div>`
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
                <div class="asset-status-controls">
                  <span class="asset-status-pill ${asset.status === ASSET_STATUS.RETURNED ? "returned" : "issued"}">
                    ${asset.status === ASSET_STATUS.RETURNED ? "Returned" : "Issued"}
                  </span>
                  <button
                    class="table-action ${asset.status === ASSET_STATUS.RETURNED ? "" : "success"}"
                    type="button"
                    data-action="update-asset-status"
                    data-employee-id="${employee.id}"
                    data-asset-id="${asset.id}"
                    data-asset-status="${asset.status === ASSET_STATUS.RETURNED ? ASSET_STATUS.ISSUED : ASSET_STATUS.RETURNED}"
                  >
                    Mark ${asset.status === ASSET_STATUS.RETURNED ? "Issued" : "Returned"}
                  </button>
                </div>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
    <div class="profile-actions">
      <div>
        <h3>Profile Actions</h3>
        <p>Edit this profile, archive returned equipment, or delete the employee record entirely.</p>
      </div>
      <div class="profile-action-buttons">
        <button class="secondary-button" type="button" data-action="edit-employee" data-employee-id="${employee.id}">
          Edit Profile
        </button>
        ${
          employee.status === "pending-return"
            ? `<button class="secondary-button success-button" type="button" data-action="archive-employee" data-employee-id="${employee.id}">Archive Returned</button>`
            : ""
        }
        <button class="secondary-button destructive-button" type="button" data-action="delete-employee" data-employee-id="${employee.id}">
          Delete Employee
        </button>
      </div>
    </div>
  `;

  profileDialog.showModal();
}

function archiveEmployee(employeeId) {
  const employee = employees.find((item) => item.id === employeeId);

  if (!employee) {
    return;
  }

  const confirmed = window.confirm(`Archive ${employee.fullName}'s profile as returned?`);

  if (!confirmed) {
    return;
  }

  employee.status = "archived";
  employee.archivedDate = new Date().toISOString().slice(0, 10);
  employee.assets = employee.assets.map((asset) => ({ ...asset, status: ASSET_STATUS.RETURNED }));
  saveEmployees();
  render();
  profileDialog.close();
  showToast("Employee asset profile archived.");
}

function deleteEmployee(employeeId) {
  const employee = employees.find((item) => item.id === employeeId);

  if (!employee) {
    return;
  }

  const confirmed = window.confirm(
    `Delete ${employee.fullName}'s asset profile? This will remove the employee from all tables.`,
  );

  if (!confirmed) {
    return;
  }

  employees = employees.filter((item) => item.id !== employeeId);
  saveEmployees();
  render();
  profileDialog.close();
  showToast("Employee asset profile deleted.");
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
  employee.trackingStatus = employee.trackingStatus || "Pending pickup";
  employee.archivedDate = "";

  saveEmployees();
  render();
  returnDialog.close();
  selectedEmployeeId = null;
  showToast("Return process started.");
}

function filterEmployees(employeeList) {
  if (!searchTerm) {
    return employeeList;
  }

  return employeeList.filter((employee) => getSearchText(employee).includes(searchTerm));
}

function getSearchText(employee) {
  return [
    employee.employeeId,
    employee.fullName,
    employee.workLocation,
    employee.address.address1,
    employee.address.address2,
    employee.address.city,
    employee.address.state,
    employee.address.zip,
    employee.trackingNumber,
    employee.trackingStatus,
    ...employee.assets.flatMap((asset) => [
      asset.equipmentName,
      asset.serialNumber,
      asset.unitPrice,
      asset.quantity,
      asset.status,
    ]),
  ]
    .join(" ")
    .toLowerCase();
}

function getAssetQuantity(employee) {
  return employee.assets.reduce((total, asset) => total + Number(asset.quantity), 0);
}

function getTotalAssetQuantity(employeeList) {
  return employeeList.reduce((total, employee) => total + getAssetQuantity(employee), 0);
}

function getIssuedAssetQuantity(employeeList) {
  return employeeList.reduce(
    (total, employee) =>
      total +
      employee.assets.reduce(
        (assetTotal, asset) =>
          asset.status === ASSET_STATUS.RETURNED ? assetTotal : assetTotal + Number(asset.quantity),
        0,
      ),
    0,
  );
}

function updateAssetStatus(employeeId, assetId, status) {
  const employee = employees.find((item) => item.id === employeeId);

  if (!employee) {
    return;
  }

  employee.assets = employee.assets.map((asset) => (asset.id === assetId ? { ...asset, status } : asset));
  saveEmployees();
  render();
  openProfileModal(employeeId);
  showToast(`Asset marked ${status === ASSET_STATUS.RETURNED ? "returned" : "issued"}.`);
}

function getAssetInventory() {
  const inventory = new Map();

  employees.forEach((employee) => {
    employee.assets.forEach((asset) => {
      const equipmentName = asset.equipmentName || "Unnamed equipment";
      const quantity = Number(asset.quantity) || 0;
      const existing = inventory.get(equipmentName) || {
        equipmentName,
        quantityIssued: 0,
        quantityAvailable: 0,
        totalValue: 0,
        units: [],
      };
      const isReturned = asset.status === ASSET_STATUS.RETURNED;

      if (isReturned) {
        existing.quantityAvailable += quantity;
      } else {
        existing.quantityIssued += quantity;
      }

      existing.totalValue += (Number(asset.unitPrice) || 0) * quantity;

      for (let index = 0; index < Math.max(quantity, 1); index += 1) {
        existing.units.push({
          ...asset,
          quantity: 1,
          serialNumber:
            quantity > 1 && asset.serialNumber
              ? `${asset.serialNumber} (${index + 1} of ${quantity})`
              : asset.serialNumber,
          employeeId: employee.id,
          employeeName: employee.fullName,
          employeeNumber: employee.employeeId,
          employeeStatus: employee.status,
        });
      }
      inventory.set(equipmentName, existing);
    });
  });

  return [...inventory.values()].sort((a, b) => a.equipmentName.localeCompare(b.equipmentName));
}

function filterInventory(inventoryItems) {
  if (!searchTerm) {
    return inventoryItems;
  }

  return inventoryItems.filter((item) =>
    [
      item.equipmentName,
      ...item.units.flatMap((unit) => [
        unit.serialNumber,
        unit.unitPrice,
        unit.quantity,
        unit.status,
        unit.employeeName,
        unit.employeeNumber,
      ]),
    ]
      .join(" ")
      .toLowerCase()
      .includes(searchTerm),
  );
}

function getInventoryTotals(inventoryItems) {
  return inventoryItems.reduce(
    (totals, item) => ({
      total: totals.total + item.quantityIssued + item.quantityAvailable,
      issued: totals.issued + item.quantityIssued,
      available: totals.available + item.quantityAvailable,
    }),
    { total: 0, issued: 0, available: 0 },
  );
}

function openAssetDetails(equipmentName) {
  const item = getAssetInventory().find((inventoryItem) => inventoryItem.equipmentName === equipmentName);

  if (!item || !assetDetailsDialog) {
    return;
  }

  assetDetailsTitle.textContent = item.equipmentName;
  assetDetailsContent.innerHTML = `
    <div class="inventory-summary">
      <span>${item.quantityIssued} issued</span>
      <span>${item.quantityAvailable} available</span>
      <span>${formatCurrency(item.totalValue)} total value</span>
    </div>
    <div class="asset-detail-list">
      ${item.units
        .flatMap((unit) =>
          Array.from({ length: Math.max(Number(unit.quantity) || 0, 1) }, (_, index) => ({ ...unit, unitIndex: index })),
        )
        .map(
          (unit) => `
            <article class="asset-detail-row">
              <div>
                <strong>
                  ${escapeHtml(
                    unit.serialNumber
                      ? unit.quantity > 1
                        ? `${unit.serialNumber} #${unit.unitIndex + 1}`
                        : unit.serialNumber
                      : `No serial number #${unit.unitIndex + 1}`,
                  )}
                </strong>
                <span>${formatCurrency(Number(unit.unitPrice))} each</span>
              </div>
              <div>
                <span class="asset-status-pill ${unit.status === ASSET_STATUS.RETURNED ? "returned" : "issued"}">
                  ${unit.status === ASSET_STATUS.RETURNED ? "Returned" : "Issued"}
                </span>
              </div>
              <div>
                ${
                  unit.status === ASSET_STATUS.RETURNED
                    ? '<span class="not-issued">Not issued</span>'
                    : `<button class="table-action" type="button" data-action="view-profile" data-employee-id="${unit.employeeId}">${escapeHtml(unit.employeeName)} (${escapeHtml(unit.employeeNumber)})</button>`
                }
              </div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
  assetDetailsDialog.showModal();
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

function getUpsTrackingUrl(trackingNumber) {
  return `https://www.ups.com/track?tracknum=${encodeURIComponent(trackingNumber)}`;
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
  if (status === "pending-return") {
    return "Assets Pending Return";
  }

  if (status === "archived") {
    return "Archived";
  }

  return "Employees With Assets";
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
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
