const storageKey = "group-savings-ledger-v2";

const sampleLedger = {
  name: "Friends Savings Circle",
  goal: 10000000,
  monthlyDue: 500000,
  currency: "IDR",
  members: [
    { id: "m-1", name: "Maya" },
    { id: "m-2", name: "Jules" },
    { id: "m-3", name: "Rafi" },
    { id: "m-4", name: "Nadia" }
  ],
  entries: [
    { id: "e-1", memberId: "m-1", amount: 750000, date: "2026-05-01", note: "Opening deposit" },
    { id: "e-2", memberId: "m-2", amount: 500000, date: "2026-05-02", note: "Monthly saving" },
    { id: "e-3", memberId: "m-3", amount: 650000, date: "2026-05-05", note: "Cash transfer" },
    { id: "e-4", memberId: "m-4", amount: 800000, date: "2026-05-10", note: "Monthly saving" },
    { id: "e-5", memberId: "m-1", amount: 300000, date: "2026-05-18", note: "Extra top-up" }
  ]
};

const blankLedger = {
  name: "Friends Savings Circle",
  goal: 10000000,
  monthlyDue: 0,
  currency: "IDR",
  members: [],
  entries: []
};

let ledger = loadLedger();
let snapshotMode = false;
let toastTimer;

const els = {
  amountInput: document.querySelector("#amountInput"),
  contributorInput: document.querySelector("#contributorInput"),
  currencyInput: document.querySelector("#currencyInput"),
  dateInput: document.querySelector("#dateInput"),
  entriesBody: document.querySelector("#entriesBody"),
  entryCount: document.querySelector("#entryCount"),
  exportBtn: document.querySelector("#exportBtn"),
  goalInput: document.querySelector("#goalInput"),
  goalText: document.querySelector("#goalText"),
  groupSubtitle: document.querySelector("#groupSubtitle"),
  groupTitle: document.querySelector("#groupTitle"),
  importInput: document.querySelector("#importInput"),
  loadSampleBtn: document.querySelector("#loadSampleBtn"),
  memberCount: document.querySelector("#memberCount"),
  memberNameInput: document.querySelector("#memberNameInput"),
  membersBody: document.querySelector("#membersBody"),
  monthlyBody: document.querySelector("#monthlyBody"),
  monthlyDueInput: document.querySelector("#monthlyDueInput"),
  monthlyMonthInput: document.querySelector("#monthlyMonthInput"),
  monthlySummary: document.querySelector("#monthlySummary"),
  modeLabel: document.querySelector("#modeLabel"),
  nameInput: document.querySelector("#nameInput"),
  noteInput: document.querySelector("#noteInput"),
  progressFill: document.querySelector("#progressFill"),
  progressPercent: document.querySelector("#progressPercent"),
  settingsForm: document.querySelector("#settingsForm"),
  memberForm: document.querySelector("#memberForm"),
  contributionForm: document.querySelector("#contributionForm"),
  shareBtn: document.querySelector("#shareBtn"),
  toast: document.querySelector("#toast"),
  totalSaved: document.querySelector("#totalSaved")
};

init();

function init() {
  const snapshot = readSnapshotFromHash();
  if (snapshot) {
    ledger = snapshot;
    snapshotMode = true;
    document.body.classList.add("snapshot");
  }

  els.dateInput.valueAsDate = new Date();
  els.monthlyMonthInput.value = getCurrentMonth();
  bindEvents();
  render();
}

function bindEvents() {
  els.settingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    ledger.name = els.nameInput.value.trim() || blankLedger.name;
    ledger.goal = Number(els.goalInput.value) || 0;
    ledger.monthlyDue = Number(els.monthlyDueInput.value) || 0;
    ledger.currency = els.currencyInput.value;
    persist();
    render();
    showToast("Group details saved.");
  });

  els.memberForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = els.memberNameInput.value.trim();
    if (!name) return;
    ledger.members.push({ id: createId("m"), name });
    els.memberNameInput.value = "";
    persist();
    render();
    showToast(`${name} added.`);
  });

  els.contributionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const memberId = els.contributorInput.value;
    const amount = Number(els.amountInput.value);
    if (!memberId || !amount) return;

    ledger.entries.push({
      id: createId("e"),
      memberId,
      amount,
      date: els.dateInput.value,
      note: els.noteInput.value.trim()
    });

    els.amountInput.value = "";
    els.noteInput.value = "";
    persist();
    render();
    showToast("Contribution recorded.");
  });

  els.membersBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-member]");
    if (!button) return;
    const memberId = button.dataset.deleteMember;
    const member = ledger.members.find((item) => item.id === memberId);
    ledger.members = ledger.members.filter((item) => item.id !== memberId);
    ledger.entries = ledger.entries.filter((item) => item.memberId !== memberId);
    persist();
    render();
    showToast(`${member?.name || "Friend"} removed.`);
  });

  els.entriesBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-entry]");
    if (!button) return;
    ledger.entries = ledger.entries.filter((entry) => entry.id !== button.dataset.deleteEntry);
    persist();
    render();
    showToast("Contribution deleted.");
  });

  els.loadSampleBtn.addEventListener("click", () => {
    ledger = structuredClone(sampleLedger);
    persist();
    render();
    showToast("Sample ledger loaded.");
  });

  els.exportBtn.addEventListener("click", exportLedger);
  els.shareBtn.addEventListener("click", copyShareLink);
  els.importInput.addEventListener("change", importLedger);
  els.monthlyMonthInput.addEventListener("change", renderMonthlyCheck);
}

function render() {
  const total = getTotalSaved();
  const percent = ledger.goal > 0 ? Math.min((total / ledger.goal) * 100, 100) : 0;

  els.nameInput.value = ledger.name;
  els.goalInput.value = ledger.goal;
  els.monthlyDueInput.value = ledger.monthlyDue || "";
  els.currencyInput.value = ledger.currency;
  els.groupTitle.textContent = ledger.name;
  els.groupSubtitle.textContent = snapshotMode
    ? "This is a shared read-only snapshot of the group savings ledger."
    : "Track who contributes, when they paid, and how close the group is to the target.";
  els.modeLabel.textContent = snapshotMode ? "Shared snapshot" : "Editable ledger";
  els.totalSaved.textContent = formatMoney(total);
  els.goalText.textContent = `Goal: ${formatMoney(ledger.goal)}`;
  els.progressPercent.textContent = `${Math.round(percent)}%`;
  els.progressFill.style.width = `${percent}%`;
  els.memberCount.textContent = `${ledger.members.length} ${ledger.members.length === 1 ? "friend" : "friends"}`;
  els.entryCount.textContent = `${ledger.entries.length} ${ledger.entries.length === 1 ? "record" : "records"}`;

  renderContributorOptions();
  renderMembers(total);
  renderMonthlyCheck();
  renderEntries();
}

function renderContributorOptions() {
  if (!ledger.members.length) {
    els.contributorInput.innerHTML = '<option value="">Add a friend first</option>';
    els.contributorInput.disabled = true;
    return;
  }

  els.contributorInput.disabled = false;
  els.contributorInput.innerHTML = ledger.members
    .map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.name)}</option>`)
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
    els.entriesBody.innerHTML = '<tr><td class="empty-row" colspan="5">No contributions recorded yet.</td></tr>';
    return;
  }

  const memberNames = new Map(ledger.members.map((member) => [member.id, member.name]));
  els.entriesBody.innerHTML = [...ledger.entries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((entry) => `
      <tr>
        <td>${formatDate(entry.date)}</td>
        <td>${escapeHtml(memberNames.get(entry.memberId) || "Unknown")}</td>
        <td class="amount">${formatMoney(entry.amount)}</td>
        <td class="muted">${escapeHtml(entry.note || "-")}</td>
        <td class="edit-column">
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
    els.monthlySummary.innerHTML = "<span>0 paid</span><span>0 unpaid</span>";
    els.monthlyBody.innerHTML = '<tr><td class="empty-row" colspan="5">Add friends to check monthly payments.</td></tr>';
    return;
  }

  const rows = ledger.members.map((member) => {
    const monthEntries = ledger.entries.filter((entry) => {
      return entry.memberId === member.id && entry.date?.startsWith(month);
    });
    const paid = monthEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const lastPayment = monthEntries
      .map((entry) => entry.date)
      .sort()
      .pop();
    const status = getMonthlyStatus(paid, expected);
    return { member, paid, lastPayment, status };
  });

  const paidCount = rows.filter((row) => row.status.kind === "paid").length;
  const partialCount = rows.filter((row) => row.status.kind === "partial").length;
  const unpaidCount = rows.filter((row) => row.status.kind === "unpaid").length;

  els.monthlySummary.innerHTML = `
    <span>${paidCount} paid</span>
    <span>${partialCount} partial</span>
    <span>${unpaidCount} unpaid</span>
  `;

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

function getCurrentMonth() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `${today.getFullYear()}-${month}`;
}

function persist() {
  if (!snapshotMode) {
    localStorage.setItem(storageKey, JSON.stringify(ledger));
  }
}

function loadLedger() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return saved ? normalizeLedger(saved) : structuredClone(blankLedger);
  } catch {
    return structuredClone(blankLedger);
  }
}

function normalizeLedger(value) {
  return {
    name: String(value.name || blankLedger.name),
    goal: Number(value.goal || blankLedger.goal),
    monthlyDue: Number(value.monthlyDue || blankLedger.monthlyDue),
    currency: String(value.currency || blankLedger.currency),
    members: Array.isArray(value.members) ? value.members.map(normalizeMember) : [],
    entries: Array.isArray(value.entries) ? value.entries.map(normalizeEntry) : []
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
    date: String(entry.date || new Date().toISOString().slice(0, 10)),
    note: String(entry.note || "")
  };
}

function createId(prefix) {
  return `${prefix}-${crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)}`;
}

function exportLedger() {
  const blob = new Blob([JSON.stringify(ledger, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${ledger.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "group-savings"}-ledger.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("Ledger exported.");
}

async function importLedger(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    ledger = normalizeLedger(JSON.parse(text));
    snapshotMode = false;
    document.body.classList.remove("snapshot");
    window.history.replaceState(null, "", window.location.pathname);
    persist();
    render();
    showToast("Ledger imported.");
  } catch {
    showToast("That file could not be imported.");
  } finally {
    event.target.value = "";
  }
}

async function copyShareLink() {
  const snapshot = btoa(unescape(encodeURIComponent(JSON.stringify(ledger))));
  const link = `${window.location.origin}${window.location.pathname}#snapshot=${snapshot}`;
  try {
    await navigator.clipboard.writeText(link);
    showToast("Share link copied. Host this file online first so friends can open it.");
  } catch {
    showToast("Copy failed. Export the ledger instead.");
  }
}

function readSnapshotFromHash() {
  if (!window.location.hash.startsWith("#snapshot=")) return null;
  try {
    const data = window.location.hash.replace("#snapshot=", "");
    return normalizeLedger(JSON.parse(decodeURIComponent(escape(atob(data)))));
  } catch {
    showToast("The shared snapshot link is not valid.");
    return null;
  }
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
