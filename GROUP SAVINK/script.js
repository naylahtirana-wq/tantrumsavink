const storageKey = "tantrum-savings-ledger-v5";
const friendModeKey = "tantrum-friend-contribution-mode";

const sampleLedger = {
  name: "Tantrum's Money",
  goal: 10000000,
  monthlyDue: 50000,
  currency: "IDR",
  members: [
    { id: "m-1", name: "Naylah Joestar" },
    { id: "m-2", name: "Arsyifa" },
    { id: "m-3", name: "Mila" },
    { id: "m-4", name: "Ditha" },
    { id: "m-5", name: "Dwikur" },
    { id: "m-6", name: "Vanka" },
    { id: "m-7", name: "Tantrum Friend" }
  ],
  entries: [
    { id: "e-1", memberId: "m-1", amount: 50000, date: "2026-01-01" },
    { id: "e-2", memberId: "m-1", amount: 50000, date: "2026-02-01" }
  ]
};

const blankLedger = {
  name: "Tantrum's Money",
  goal: 10000000,
  monthlyDue: 50000,
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
  monthlyCollected: document.querySelector("#monthlyCollected"),
  monthlyDueInput: document.querySelector("#monthlyDueInput"),
  monthlyMonthInput: document.querySelector("#monthlyMonthInput"),
  monthlyPeopleText: document.querySelector("#monthlyPeopleText"),
  monthlyProgressFill: document.querySelector("#monthlyProgressFill"),
  monthlyProgressText: document.querySelector("#monthlyProgressText"),
  monthlySummary: document.querySelector("#monthlySummary"),
  monthlyTarget: document.querySelector("#monthlyTarget"),
  monthsCoveredInput: document.querySelector("#monthsCoveredInput"),
  modeLabel: document.querySelector("#modeLabel"),
  nameInput: document.querySelector("#nameInput"),
  paymentMonthInput: document.querySelector("#paymentMonthInput"),
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
  if (new URLSearchParams(window.location.search).get("owner") === "1") {
    sessionStorage.removeItem(friendModeKey);
    window.history.replaceState(null, "", window.location.pathname);
  }

  const snapshot = readSnapshotFromHash();
  if (snapshot) {
    ledger = snapshot;
    snapshotMode = true;
    document.body.classList.add("snapshot");
    sessionStorage.setItem(friendModeKey, "true");
    window.history.replaceState(null, "", window.location.pathname);
    localStorage.setItem(storageKey, JSON.stringify(ledger));
  } else if (sessionStorage.getItem(friendModeKey) === "true") {
    snapshotMode = true;
    document.body.classList.add("snapshot");
  }

  els.paymentMonthInput.value = getCurrentMonth();
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
    const startMonth = els.paymentMonthInput.value;
    const monthsCovered = Math.max(1, Number(els.monthsCoveredInput.value) || 1);
    if (!memberId || !amount || !startMonth) return;

    const monthlyAmount = amount / monthsCovered;
    for (let index = 0; index < monthsCovered; index += 1) {
      ledger.entries.push({
        id: createId("e"),
        memberId,
        amount: monthlyAmount,
        date: `${addMonths(startMonth, index)}-01`
      });
    }

    els.amountInput.value = "";
    els.monthsCoveredInput.value = "1";
    persist();
    render();
    showToast(`Contribution saved for ${monthsCovered} ${monthsCovered === 1 ? "month" : "months"}.`);
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
    ? "Choose your name and fill your contribution. Your update saves in this browser."
    : "Track who contributes, when they paid, and how close the group is to the target.";
  els.modeLabel.textContent = snapshotMode ? "Friend contribution link" : "Editable ledger";
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
  const collected = rows.reduce((sum, row) => sum + row.paid, 0);
  const monthlyTarget = expected > 0 ? expected * ledger.members.length : collected;
  const amountProgress = monthlyTarget > 0 ? Math.min((collected / monthlyTarget) * 100, 100) : 0;
  const peopleProgress = ledger.members.length > 0 ? Math.round((paidCount / ledger.members.length) * 100) : 0;

  els.monthlySummary.innerHTML = `
    <span>${paidCount} paid</span>
    <span>${partialCount} partial</span>
    <span>${unpaidCount} unpaid</span>
  `;
  els.monthlyCollected.textContent = formatMoney(collected);
  els.monthlyTarget.textContent = expected > 0 ? formatMoney(monthlyTarget) : "Set monthly amount";
  els.monthlyProgressText.textContent = `${Math.round(amountProgress)}% paid`;
  els.monthlyPeopleText.textContent = `${paidCount} of ${ledger.members.length} friends`;
  els.monthlyProgressFill.style.width = `${expected > 0 ? amountProgress : peopleProgress}%`;

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

function addMonths(monthValue, offset) {
  const [year, month] = monthValue.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  const resultYear = date.getFullYear();
  const resultMonth = String(date.getMonth() + 1).padStart(2, "0");
  return `${resultYear}-${resultMonth}`;
}

function persist() {
  localStorage.setItem(storageKey, JSON.stringify(ledger));
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
    date: String(entry.date || `${getCurrentMonth()}-01`)
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
    sessionStorage.removeItem(friendModeKey);
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
    showToast("Editable contribution link copied.");
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
