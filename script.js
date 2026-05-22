const storageKey = "tantrum-savings-ledger-v8";
const paymentMonths = [
  ["01", "Jan"],
  ["02", "Feb"],
  ["03", "Mar"],
  ["04", "Apr"],
  ["05", "May"],
  ["06", "Jun"],
  ["07", "Jul"],
  ["08", "Aug"],
  ["09", "Sep"],
  ["10", "Oct"],
  ["11", "Nov"],
  ["12", "Dec"]
];

const defaultLedger = {
  name: "Tantrum's Money",
  goal: 10000000,
  monthlyDue: 50000,
  currency: "IDR",
  members: [
    { id: "m-1", name: "Naylah Joestar" },
    { id: "m-2", name: "Arsyifa" },
    { id: "m-3", name: "Mila" },
    { id: "m-4", name: "Ditha" },
    { id: "m-5", name: "Dwi Kurnia" },
    { id: "m-6", name: "Vanka" },
    { id: "m-7", name: "Selvi" },
    { id: "m-8", name: "Salma" },
    { id: "m-9", name: "Zata" }
  ],
  entries: createInitialEntries()
};

let ledger = loadLedger();
let editMode = false;
let toastTimer;

const els = {
  amountInput: document.querySelector("#amountInput"),
  contributorInput: document.querySelector("#contributorInput"),
  currencyInput: document.querySelector("#currencyInput"),
  editToggleBtn: document.querySelector("#editToggleBtn"),
  entriesBody: document.querySelector("#entriesBody"),
  entryCount: document.querySelector("#entryCount"),
  exportBtn: document.querySelector("#exportBtn"),
  goalInput: document.querySelector("#goalInput"),
  goalText: document.querySelector("#goalText"),
  groupSubtitle: document.querySelector("#groupSubtitle"),
  groupTitle: document.querySelector("#groupTitle"),
  importInput: document.querySelector("#importInput"),
  memberCount: document.querySelector("#memberCount"),
  memberForm: document.querySelector("#memberForm"),
  memberNameInput: document.querySelector("#memberNameInput"),
  membersBody: document.querySelector("#membersBody"),
  modeLabel: document.querySelector("#modeLabel"),
  monthlyBody: document.querySelector("#monthlyBody"),
  monthlyCollected: document.querySelector("#monthlyCollected"),
  monthlyDueInput: document.querySelector("#monthlyDueInput"),
  monthlyMonthInput: document.querySelector("#monthlyMonthInput"),
  monthlyPeopleText: document.querySelector("#monthlyPeopleText"),
  monthlyProgressFill: document.querySelector("#monthlyProgressFill"),
  monthlyProgressText: document.querySelector("#monthlyProgressText"),
  monthlySummary: document.querySelector("#monthlySummary"),
  monthlyTarget: document.querySelector("#monthlyTarget"),
  nameInput: document.querySelector("#nameInput"),
  paymentMonthsGroup: document.querySelector("#paymentMonthsGroup"),
  paymentYearInput: document.querySelector("#paymentYearInput"),
  progressFill: document.querySelector("#progressFill"),
  progressPercent: document.querySelector("#progressPercent"),
  settingsForm: document.querySelector("#settingsForm"),
  totalSaved: document.querySelector("#totalSaved"),
  toast: document.querySelector("#toast")
};

init();

function init() {
  renderPaymentMonthOptions();
  els.paymentYearInput.value = getCurrentYear();
  els.monthlyMonthInput.value = getCurrentMonth();
  setDefaultPaymentMonth();
  bindEvents();
  renderAll();
}

function bindEvents() {
  els.editToggleBtn.addEventListener("click", toggleEditMode);
  els.exportBtn.addEventListener("click", exportLedger);
  els.importInput.addEventListener("change", importLedger);
  els.settingsForm.addEventListener("submit", saveSettings);
  els.memberForm.addEventListener("submit", addMember);
  els.memberForm.addEventListener("reset", () => {
    els.memberNameInput.value = "";
  });
  document.querySelector("#contributionForm").addEventListener("submit", addPayment);
  els.membersBody.addEventListener("click", handleMemberActions);
  els.entriesBody.addEventListener("click", handleEntryActions);
  els.monthlyMonthInput.addEventListener("change", renderMonthlyCheck);
}

function renderAll() {
  const total = getTotalSaved();
  const percent = ledger.goal > 0 ? Math.min((total / ledger.goal) * 100, 100) : 0;

  els.nameInput.value = ledger.name;
  els.goalInput.value = ledger.goal;
  els.monthlyDueInput.value = ledger.monthlyDue;
  els.currencyInput.value = ledger.currency;
  els.groupTitle.textContent = ledger.name;
  els.groupSubtitle.textContent = editMode
    ? "Editing is on. Save updates carefully, and turn it off when you're done."
    : "Track who contributes, when they paid, and how close the group is to the target.";
  els.modeLabel.textContent = editMode ? "Editing enabled" : "Tracker view";
  els.editToggleBtn.textContent = editMode ? "Done editing" : "Edit data";
  els.totalSaved.textContent = formatMoney(total);
  els.goalText.textContent = `Goal: ${formatMoney(ledger.goal)}`;
  els.progressPercent.textContent = `${Math.round(percent)}%`;
  els.progressFill.style.width = `${percent}%`;
  els.memberCount.textContent = `${ledger.members.length} ${ledger.members.length === 1 ? "friend" : "friends"}`;
  els.entryCount.textContent = `${ledger.entries.length} ${ledger.entries.length === 1 ? "record" : "records"}`;

  renderContributorOptions();
  renderMembers(total);
  renderEntries();
  renderMonthlyCheck();
  applyEditMode();
}

function applyEditMode() {
  document.body.classList.toggle("editing", editMode);
  [
    els.nameInput,
    els.goalInput,
    els.monthlyDueInput,
    els.currencyInput,
    els.memberNameInput,
    els.contributorInput,
    els.amountInput,
    els.paymentYearInput
  ].forEach((element) => {
    element.disabled = !editMode;
  });

  els.importInput.disabled = !editMode;
  document
    .querySelectorAll('input[name="paymentMonths"]')
    .forEach((input) => {
      input.disabled = !editMode;
    });
}

function toggleEditMode() {
  editMode = !editMode;
  renderAll();
  showToast(editMode ? "Edit mode turned on." : "Edit mode turned off.");
}

function saveSettings(event) {
  event.preventDefault();
  if (!editMode) return;
  ledger.name = els.nameInput.value.trim() || defaultLedger.name;
  ledger.goal = Number(els.goalInput.value) || 0;
  ledger.monthlyDue = Number(els.monthlyDueInput.value) || 0;
  ledger.currency = els.currencyInput.value;
  persist();
  renderAll();
  showToast("Group details saved.");
}

function addMember(event) {
  event.preventDefault();
  if (!editMode) return;
  const name = els.memberNameInput.value.trim();
  if (!name) return;
  ledger.members.push({ id: createId("m"), name });
  els.memberNameInput.value = "";
  persist();
  renderAll();
  showToast(`${name} added.`);
}

function addPayment(event) {
  event.preventDefault();
  if (!editMode) return;
  const memberId = els.contributorInput.value;
  const amount = Number(els.amountInput.value);
  const year = Number(els.paymentYearInput.value);
  const selectedMonths = getSelectedPaymentMonths();

  if (!memberId || !amount || !year || !selectedMonths.length) {
    showToast("Choose a friend, amount, year, and at least one month.");
    return;
  }

  const monthlyAmount = amount / selectedMonths.length;
  selectedMonths.forEach((month) => {
    ledger.entries.push({
      id: createId("e"),
      memberId,
      amount: monthlyAmount,
      date: `${year}-${month}-01`
    });
  });

  els.amountInput.value = "";
  clearSelectedPaymentMonths();
  persist();
  renderAll();
  showToast(`Payment saved for ${selectedMonths.length} ${selectedMonths.length === 1 ? "month" : "months"}.`);
}

function handleMemberActions(event) {
  const button = event.target.closest("[data-delete-member]");
  if (!button || !editMode) return;
  const memberId = button.dataset.deleteMember;
  const member = ledger.members.find((item) => item.id === memberId);
  ledger.members = ledger.members.filter((item) => item.id !== memberId);
  ledger.entries = ledger.entries.filter((item) => item.memberId !== memberId);
  persist();
  renderAll();
  showToast(`${member?.name || "Friend"} removed.`);
}

function handleEntryActions(event) {
  const editButton = event.target.closest("[data-edit-entry]");
  if (editButton) {
    editEntry(editButton.dataset.editEntry);
    return;
  }

  const deleteButton = event.target.closest("[data-delete-entry]");
  if (!deleteButton || !editMode) return;
  ledger.entries = ledger.entries.filter((entry) => entry.id !== deleteButton.dataset.deleteEntry);
  persist();
  renderAll();
  showToast("Payment deleted.");
}

function editEntry(entryId) {
  if (!editMode) return;
  const entry = ledger.entries.find((item) => item.id === entryId);
  if (!entry) return;

  const nextAmount = Number(window.prompt("New amount", String(entry.amount)));
  if (!nextAmount) return;
  const nextMonth = window.prompt("Paid month (YYYY-MM)", entry.date.slice(0, 7));
  if (!/^\d{4}-\d{2}$/.test(nextMonth || "")) {
    showToast("Use YYYY-MM format.");
    return;
  }

  entry.amount = nextAmount;
  entry.date = `${nextMonth}-01`;
  persist();
  renderAll();
  showToast("Payment updated.");
}

function renderContributorOptions() {
  if (!ledger.members.length) {
    els.contributorInput.innerHTML = '<option value="">Add a friend first</option>';
    return;
  }

  els.contributorInput.innerHTML = ledger.members
    .map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.name)}</option>`)
    .join("");
}

function renderPaymentMonthOptions() {
  els.paymentMonthsGroup.innerHTML = paymentMonths
    .map(([value, label]) => `
      <label class="month-chip">
        <input type="checkbox" name="paymentMonths" value="${value}" />
        <span>${label}</span>
      </label>
    `)
    .join("");
}

function renderMembers(total) {
  if (!ledger.members.length) {
    els.membersBody.innerHTML = '<tr><td class="empty-row" colspan="4">No friends added yet.</td></tr>';
    return;
  }

  els.membersBody.innerHTML = ledger.members
    .map((member) => {
      const contributed = getMemberTotal(member.id);
      const share = total > 0 ? Math.round((contributed / total) * 100) : 0;
      return `
        <tr>
          <td>${escapeHtml(member.name)}</td>
          <td class="amount">${formatMoney(contributed)}</td>
          <td>${share}%</td>
          <td class="edit-column">
            <button class="delete-btn" type="button" data-delete-member="${escapeHtml(member.id)}">Remove</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderEntries() {
  if (!ledger.entries.length) {
    els.entriesBody.innerHTML = '<tr><td class="empty-row" colspan="4">No contributions recorded yet.</td></tr>';
    return;
  }

  const memberNames = new Map(ledger.members.map((member) => [member.id, member.name]));
  els.entriesBody.innerHTML = [...ledger.entries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((entry) => `
      <tr>
        <td>${formatMonth(entry.date)}</td>
        <td>${escapeHtml(memberNames.get(entry.memberId) || "Unknown")}</td>
        <td class="amount">${formatMoney(entry.amount)}</td>
        <td class="edit-column">
          <button class="secondary mini-btn" type="button" data-edit-entry="${escapeHtml(entry.id)}">Edit</button>
          <button class="delete-btn" type="button" data-delete-entry="${escapeHtml(entry.id)}">Delete</button>
        </td>
      </tr>
    `)
    .join("");
}

function renderMonthlyCheck() {
  const month = els.monthlyMonthInput.value || getCurrentMonth();
  const expected = Number(ledger.monthlyDue || 0);

  if (!ledger.members.length) {
    els.monthlySummary.innerHTML = "<span>0 paid</span><span>0 partial</span><span>0 unpaid</span>";
    els.monthlyCollected.textContent = formatMoney(0);
    els.monthlyTarget.textContent = formatMoney(0);
    els.monthlyProgressText.textContent = "0% paid";
    els.monthlyPeopleText.textContent = "0 of 0 friends";
    els.monthlyProgressFill.style.width = "0%";
    els.monthlyBody.innerHTML = '<tr><td class="empty-row" colspan="5">Add friends to check monthly payments.</td></tr>';
    return;
  }

  const rows = ledger.members.map((member) => {
    const monthEntries = ledger.entries.filter((entry) => entry.memberId === member.id && entry.date.startsWith(month));
    const paid = monthEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const lastPayment = monthEntries.map((entry) => entry.date).sort().pop();
    return {
      member,
      paid,
      lastPayment,
      status: getMonthlyStatus(paid, expected)
    };
  });

  const paidCount = rows.filter((row) => row.status.kind === "paid").length;
  const partialCount = rows.filter((row) => row.status.kind === "partial").length;
  const unpaidCount = rows.filter((row) => row.status.kind === "unpaid").length;
  const collected = rows.reduce((sum, row) => sum + row.paid, 0);
  const monthlyTarget = expected > 0 ? expected * ledger.members.length : collected;
  const amountProgress = monthlyTarget > 0 ? Math.min((collected / monthlyTarget) * 100, 100) : 0;

  els.monthlySummary.innerHTML = `
    <span>${paidCount} paid</span>
    <span>${partialCount} partial</span>
    <span>${unpaidCount} unpaid</span>
  `;
  els.monthlyCollected.textContent = formatMoney(collected);
  els.monthlyTarget.textContent = expected > 0 ? formatMoney(monthlyTarget) : "Set monthly amount";
  els.monthlyProgressText.textContent = `${Math.round(amountProgress)}% paid`;
  els.monthlyPeopleText.textContent = `${paidCount} of ${ledger.members.length} friends`;
  els.monthlyProgressFill.style.width = `${amountProgress}%`;

  els.monthlyBody.innerHTML = rows
    .map((row) => `
      <tr>
        <td>${escapeHtml(row.member.name)}</td>
        <td><span class="status-pill ${row.status.kind}">${row.status.label}</span></td>
        <td class="amount">${formatMoney(row.paid)}</td>
        <td>${expected > 0 ? formatMoney(expected) : "Any amount"}</td>
        <td class="muted">${row.lastPayment ? formatDate(row.lastPayment) : "-"}</td>
      </tr>
    `)
    .join("");
}

function exportLedger() {
  const blob = new Blob([JSON.stringify(ledger, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${ledger.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "tantrum-money"}-ledger.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("Tracker exported.");
}

async function importLedger(event) {
  if (!editMode) {
    event.target.value = "";
    return;
  }

  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    ledger = normalizeLedger(JSON.parse(text));
    persist();
    renderAll();
    showToast("Tracker imported.");
  } catch {
    showToast("That file could not be imported.");
  } finally {
    event.target.value = "";
  }
}

function persist() {
  localStorage.setItem(storageKey, JSON.stringify(ledger));
}

function loadLedger() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return saved ? normalizeLedger(saved) : structuredClone(defaultLedger);
  } catch {
    return structuredClone(defaultLedger);
  }
}

function normalizeLedger(value) {
  return {
    name: String(value.name || defaultLedger.name),
    goal: Number(value.goal || defaultLedger.goal),
    monthlyDue: Number(value.monthlyDue || defaultLedger.monthlyDue),
    currency: String(value.currency || defaultLedger.currency),
    members: Array.isArray(value.members) ? value.members.map(normalizeMember) : structuredClone(defaultLedger.members),
    entries: Array.isArray(value.entries) ? value.entries.map(normalizeEntry) : createInitialEntries()
  };
}

function normalizeMember(member) {
  return {
    id: String(member.id || createId("m")),
    name: String(member.name || "Friend")
  };
}

function normalizeEntry(entry) {
  return {
    id: String(entry.id || createId("e")),
    memberId: String(entry.memberId || ""),
    amount: Number(entry.amount || 0),
    date: String(entry.date || `${getCurrentMonth()}-01`)
  };
}

function getMonthlyStatus(paid, expected) {
  if (expected > 0 && paid >= expected) return { kind: "paid", label: "Paid" };
  if (expected > 0 && paid > 0) return { kind: "partial", label: "Partial" };
  if (expected === 0 && paid > 0) return { kind: "paid", label: "Paid" };
  return { kind: "unpaid", label: "Unpaid" };
}

function getTotalSaved() {
  return ledger.entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
}

function getMemberTotal(memberId) {
  return ledger.entries
    .filter((entry) => entry.memberId === memberId)
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
}

function formatMoney(value) {
  const locale = ledger.currency === "IDR" ? "id-ID" : undefined;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: ledger.currency || "IDR",
    maximumFractionDigits: ledger.currency === "IDR" ? 0 : 2
  }).format(Number(value || 0));
}

function formatDate(date) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(parsed);
}

function formatMonth(date) {
  const parsed = new Date(`${date.slice(0, 7)}-01T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(parsed);
}

function getCurrentMonth() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `${today.getFullYear()}-${month}`;
}

function getCurrentYear() {
  return new Date().getFullYear();
}

function setDefaultPaymentMonth() {
  const currentMonth = getCurrentMonth().slice(5, 7);
  const currentOption = els.paymentMonthsGroup.querySelector(`[value="${currentMonth}"]`);
  if (currentOption) currentOption.checked = true;
}

function getSelectedPaymentMonths() {
  return [...els.paymentMonthsGroup.querySelectorAll('input[name="paymentMonths"]:checked')]
    .map((input) => input.value)
    .sort();
}

function clearSelectedPaymentMonths() {
  els.paymentMonthsGroup.querySelectorAll('input[name="paymentMonths"]').forEach((input) => {
    input.checked = false;
  });
}

function createId(prefix) {
  return `${prefix}-${crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)}`;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 3200);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createInitialEntries() {
  const entries = [];
  const addPaidMonths = (memberId, fullMonths, partialMonthAmount = 0) => {
    for (let month = 1; month <= fullMonths; month += 1) {
      entries.push({
        id: `initial-${memberId}-${String(month).padStart(2, "0")}`,
        memberId,
        amount: 50000,
        date: `2026-${String(month).padStart(2, "0")}-01`
      });
    }

    if (partialMonthAmount > 0) {
      entries.push({
        id: `initial-${memberId}-partial`,
        memberId,
        amount: partialMonthAmount,
        date: `2026-${String(fullMonths + 1).padStart(2, "0")}-01`
      });
    }
  };

  addPaidMonths("m-1", 5);
  addPaidMonths("m-2", 4);
  addPaidMonths("m-3", 5);
  addPaidMonths("m-4", 3);
  addPaidMonths("m-5", 3);
  addPaidMonths("m-6", 3);
  addPaidMonths("m-7", 5);
  addPaidMonths("m-8", 4, 25000);
  addPaidMonths("m-9", 4);
  return entries;
}
