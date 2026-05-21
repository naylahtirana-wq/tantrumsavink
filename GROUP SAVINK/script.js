const defaultLedger = {
  name: "Tantrum's Money",
  goal: 10000000,
  monthlyDue: 50000,
  currency: "IDR"
};

const defaultMembers = [
  { id: "m-1", name: "Naylah Joestar" },
  { id: "m-2", name: "Arsyifa" },
  { id: "m-3", name: "Mila" },
  { id: "m-4", name: "Ditha" },
  { id: "m-5", name: "Dwi Kurnia" },
  { id: "m-6", name: "Vanka" },
  { id: "m-7", name: "Selvi" },
  { id: "m-8", name: "Salma" },
  { id: "m-9", name: "Zata" }
];

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

const state = {
  supabase: null,
  configured: false,
  user: null,
  group: null,
  role: "viewer",
  groupMember: null,
  members: [],
  payments: [],
  publicView: false,
  invite: null
};

const els = {
  amountInput: document.querySelector("#amountInput"),
  authForm: document.querySelector("#authForm"),
  authPanel: document.querySelector("#authPanel"),
  contributionForm: document.querySelector("#contributionForm"),
  contributorInput: document.querySelector("#contributorInput"),
  copyAdminLinkBtn: document.querySelector("#copyAdminLinkBtn"),
  copyMemberLinkBtn: document.querySelector("#copyMemberLinkBtn"),
  copyViewLinkBtn: document.querySelector("#copyViewLinkBtn"),
  createGroupBtn: document.querySelector("#createGroupBtn"),
  currencyInput: document.querySelector("#currencyInput"),
  emailInput: document.querySelector("#emailInput"),
  entriesBody: document.querySelector("#entriesBody"),
  entryCount: document.querySelector("#entryCount"),
  goalInput: document.querySelector("#goalInput"),
  goalText: document.querySelector("#goalText"),
  groupLinkText: document.querySelector("#groupLinkText"),
  groupSubtitle: document.querySelector("#groupSubtitle"),
  groupTitle: document.querySelector("#groupTitle"),
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
  passwordInput: document.querySelector("#passwordInput"),
  paymentMonthsGroup: document.querySelector("#paymentMonthsGroup"),
  paymentYearInput: document.querySelector("#paymentYearInput"),
  progressFill: document.querySelector("#progressFill"),
  progressPercent: document.querySelector("#progressPercent"),
  refreshBtn: document.querySelector("#refreshBtn"),
  roleLabel: document.querySelector("#roleLabel"),
  sessionPanel: document.querySelector("#sessionPanel"),
  sessionText: document.querySelector("#sessionText"),
  settingsForm: document.querySelector("#settingsForm"),
  setupPanel: document.querySelector("#setupPanel"),
  shareBtn: document.querySelector("#shareBtn"),
  sharePanel: document.querySelector("#sharePanel"),
  signOutBtn: document.querySelector("#signOutBtn"),
  signUpBtn: document.querySelector("#signUpBtn"),
  toast: document.querySelector("#toast"),
  totalSaved: document.querySelector("#totalSaved")
};

let toastTimer;

init();

async function init() {
  renderPaymentMonthOptions();
  els.paymentYearInput.value = getCurrentYear();
  setDefaultPaymentMonth();
  els.monthlyMonthInput.value = getCurrentMonth();
  bindEvents();

  state.configured = configureSupabase();
  if (!state.configured) {
    els.setupPanel.hidden = false;
    renderEmpty();
    applyPermissions();
    return;
  }

  const { data } = await state.supabase.auth.getSession();
  state.user = data.session?.user || null;

  state.supabase.auth.onAuthStateChange(async (_event, session) => {
    state.user = session?.user || null;
    await loadApp();
  });

  await loadApp();
}

function configureSupabase() {
  const config = window.SUPABASE_CONFIG || {};
  if (!window.supabase || !config.url || !config.anonKey || config.url.includes("YOUR_")) {
    return false;
  }
  state.supabase = window.supabase.createClient(config.url, config.anonKey);
  return true;
}

function bindEvents() {
  els.authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await signIn();
  });
  els.signUpBtn.addEventListener("click", signUp);
  els.signOutBtn.addEventListener("click", signOut);
  els.createGroupBtn.addEventListener("click", createGroup);
  els.refreshBtn.addEventListener("click", loadApp);
  els.shareBtn.addEventListener("click", copyViewLink);
  els.copyViewLinkBtn.addEventListener("click", copyViewLink);
  els.copyAdminLinkBtn.addEventListener("click", () => copyInviteLink("admin"));
  els.copyMemberLinkBtn.addEventListener("click", () => copyInviteLink("member"));
  els.monthlyMonthInput.addEventListener("change", renderMonthlyCheck);
  els.settingsForm.addEventListener("submit", saveSettings);
  els.memberForm.addEventListener("submit", addMember);
  els.contributionForm.addEventListener("submit", addPayment);
  els.membersBody.addEventListener("click", deleteMemberFromClick);
  els.entriesBody.addEventListener("click", deletePaymentFromClick);
}

async function loadApp() {
  if (!state.configured) return;

  const params = getParams();
  state.publicView = Boolean(params.viewToken);
  state.group = null;
  state.groupMember = null;
  state.members = [];
  state.payments = [];
  state.role = "viewer";

  if (params.viewToken && params.groupShortId) {
    await loadPublicTracker(params.groupShortId, params.viewToken);
  } else if (state.user && params.groupShortId) {
    await handleInvite(params);
    await loadPrivateTracker(params.groupShortId);
  } else if (state.user) {
    await loadFirstUserTracker();
  }

  renderAll();
  applyPermissions();
}

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    groupShortId: params.get("g") || params.get("group"),
    inviteToken: params.get("invite"),
    viewToken: params.get("view")
  };
}

async function loadPublicTracker(groupShortId, viewToken) {
  const { data, error } = await state.supabase.rpc("get_public_tracker", {
    p_short_id: groupShortId,
    p_view_token: viewToken
  });
  if (error) {
    showToast(error.message);
    return;
  }
  assignTrackerPayload(data);
  state.publicView = true;
  state.role = "viewer";
}

async function handleInvite(params) {
  if (!params.inviteToken) return;

  const { data: existing } = await state.supabase
    .from("groups")
    .select("id, group_members(role, member_id)")
    .eq("short_id", params.groupShortId)
    .maybeSingle();
  if (existing?.group_members?.length) return;

  const inviteInfo = await getInviteInfo(params.groupShortId, params.inviteToken);
  let memberId = null;
  if (inviteInfo?.role === "member") {
    memberId = promptMemberChoice(inviteInfo.members || []);
    if (!memberId) {
      showToast("Choose a member before joining.");
      return;
    }
  }

  const { error } = await state.supabase.rpc("join_group_with_invite", {
    p_short_id: params.groupShortId,
    p_token: params.inviteToken,
    p_member_id: memberId
  });
  if (error) showToast(error.message);
}

async function getInviteInfo(groupShortId, token) {
  const { data, error } = await state.supabase.rpc("get_invite_info", {
    p_short_id: groupShortId,
    p_token: token
  });
  if (error) {
    showToast(error.message);
    return null;
  }
  return data;
}

function promptMemberChoice(members) {
  if (!members.length) return null;
  const list = members.map((member, index) => `${index + 1}. ${member.name}`).join("\n");
  const answer = window.prompt(`Which member are you?\n${list}`);
  const index = Number(answer) - 1;
  return members[index]?.id || null;
}

async function loadPrivateTracker(groupShortId) {
  const { data: group, error: groupError } = await state.supabase
    .from("groups")
    .select("id, short_id, name, goal, monthly_due, currency, view_token")
    .eq("short_id", groupShortId)
    .maybeSingle();
  if (groupError) {
    showToast(groupError.message);
    return;
  }
  if (!group) return;

  state.group = group;
  await loadRole(group.id);
  await loadMembersAndPayments(group.id);
}

async function loadFirstUserTracker() {
  const { data, error } = await state.supabase
    .from("group_members")
    .select("role, member_id, groups(id, short_id, name, goal, monthly_due, currency, view_token)")
    .eq("user_id", state.user.id)
    .limit(1)
    .maybeSingle();
  if (error) {
    showToast(error.message);
    return;
  }
  if (!data?.groups) return;

  state.group = data.groups;
  state.role = data.role;
  state.groupMember = data;
  setUrlGroup(state.group.short_id);
  await loadMembersAndPayments(state.group.id);
}

async function loadRole(groupId) {
  const { data, error } = await state.supabase
    .from("group_members")
    .select("role, member_id")
    .eq("group_id", groupId)
    .eq("user_id", state.user.id)
    .maybeSingle();
  if (error) {
    showToast(error.message);
    return;
  }
  state.groupMember = data || null;
  state.role = data?.role || "viewer";
}

async function loadMembersAndPayments(groupId) {
  const [{ data: members, error: membersError }, { data: payments, error: paymentsError }] = await Promise.all([
    state.supabase.from("members").select("id, name").eq("group_id", groupId).order("name"),
    state.supabase.from("payments").select("id, member_id, created_by, amount, paid_month").eq("group_id", groupId).order("paid_month", { ascending: false })
  ]);
  if (membersError || paymentsError) {
    showToast(membersError?.message || paymentsError?.message);
    return;
  }
  state.members = members || [];
  state.payments = (payments || []).map((payment) => ({
    id: payment.id,
    memberId: payment.member_id,
    createdBy: payment.created_by,
    amount: Number(payment.amount),
    date: payment.paid_month
  }));
}

function assignTrackerPayload(payload) {
  state.group = payload.group;
  state.members = payload.members || [];
  state.payments = (payload.payments || []).map((payment) => ({
    id: payment.id,
    memberId: payment.member_id,
    createdBy: payment.created_by,
    amount: Number(payment.amount),
    date: payment.paid_month
  }));
}

async function signIn() {
  const { error } = await state.supabase.auth.signInWithPassword({
    email: els.emailInput.value,
    password: els.passwordInput.value
  });
  if (error) showToast(error.message);
}

async function signUp() {
  const { error } = await state.supabase.auth.signUp({
    email: els.emailInput.value,
    password: els.passwordInput.value
  });
  showToast(error ? error.message : "Account created. Check email if confirmation is enabled.");
}

async function signOut() {
  await state.supabase.auth.signOut();
  state.user = null;
  state.group = null;
  state.members = [];
  state.payments = [];
  state.role = "viewer";
  renderAll();
  applyPermissions();
}

async function createGroup() {
  const { data, error } = await state.supabase.rpc("create_default_tantrum_group");
  if (error) {
    showToast(error.message);
    return;
  }
  setUrlGroup(data.short_id);
  await loadPrivateTracker(data.short_id);
  renderAll();
  applyPermissions();
  showToast("Supabase tracker created.");
}

async function saveSettings(event) {
  event.preventDefault();
  if (!canAdmin()) return;
  const { error } = await state.supabase
    .from("groups")
    .update({
      name: els.nameInput.value.trim(),
      goal: Number(els.goalInput.value) || 0,
      monthly_due: Number(els.monthlyDueInput.value) || 0,
      currency: els.currencyInput.value
    })
    .eq("id", state.group.id);
  if (error) {
    showToast(error.message);
    return;
  }
  await loadPrivateTracker(state.group.short_id);
  renderAll();
  showToast("Group details saved.");
}

async function addMember(event) {
  event.preventDefault();
  if (!canAdmin()) return;
  const name = els.memberNameInput.value.trim();
  if (!name) return;
  const { error } = await state.supabase.from("members").insert({
    group_id: state.group.id,
    name
  });
  if (error) {
    showToast(error.message);
    return;
  }
  els.memberNameInput.value = "";
  await reloadTracker();
  showToast(`${name} added.`);
}

async function addPayment(event) {
  event.preventDefault();
  if (!canAddPayment()) return;
  const memberId = canAdmin() ? els.contributorInput.value : state.groupMember?.member_id;
  const amount = Number(els.amountInput.value);
  const year = Number(els.paymentYearInput.value);
  const selectedMonths = getSelectedPaymentMonths();
  if (!memberId || !amount || !year || !selectedMonths.length) {
    showToast("Choose a friend, amount, year, and month.");
    return;
  }

  const monthlyAmount = amount / selectedMonths.length;
  const rows = selectedMonths.map((month) => ({
    group_id: state.group.id,
    member_id: memberId,
    amount: monthlyAmount,
    paid_month: `${year}-${month}-01`
  }));

  const { error } = await state.supabase.from("payments").insert(rows);
  if (error) {
    showToast(error.message);
    return;
  }
  els.amountInput.value = "";
  clearSelectedPaymentMonths();
  await reloadTracker();
  showToast(`Payment saved for ${selectedMonths.length} ${selectedMonths.length === 1 ? "month" : "months"}.`);
}

async function deleteMemberFromClick(event) {
  const button = event.target.closest("[data-delete-member]");
  if (!button || !canAdmin()) return;
  const { error } = await state.supabase.from("members").delete().eq("id", button.dataset.deleteMember);
  if (error) {
    showToast(error.message);
    return;
  }
  await reloadTracker();
}

async function deletePaymentFromClick(event) {
  const editButton = event.target.closest("[data-edit-entry]");
  if (editButton) {
    await editPayment(editButton.dataset.editEntry);
    return;
  }

  const button = event.target.closest("[data-delete-entry]");
  if (!button) return;
  const payment = state.payments.find((item) => item.id === button.dataset.deleteEntry);
  if (!payment || !canEditPayment(payment)) return;
  const { error } = await state.supabase.from("payments").delete().eq("id", payment.id);
  if (error) {
    showToast(error.message);
    return;
  }
  await reloadTracker();
}

async function editPayment(paymentId) {
  const payment = state.payments.find((item) => item.id === paymentId);
  if (!payment || !canEditPayment(payment)) return;

  const nextAmount = Number(window.prompt("New amount", String(payment.amount)));
  if (!nextAmount) return;
  const nextMonth = window.prompt("Paid month (YYYY-MM)", payment.date.slice(0, 7));
  if (!/^\d{4}-\d{2}$/.test(nextMonth || "")) {
    showToast("Use YYYY-MM format.");
    return;
  }

  const { error } = await state.supabase
    .from("payments")
    .update({
      amount: nextAmount,
      paid_month: `${nextMonth}-01`
    })
    .eq("id", payment.id);
  if (error) {
    showToast(error.message);
    return;
  }
  await reloadTracker();
  showToast("Payment updated.");
}

async function reloadTracker() {
  if (!state.group?.short_id) return;
  if (state.publicView) {
    const params = getParams();
    await loadPublicTracker(params.groupShortId, params.viewToken);
  } else {
    await loadPrivateTracker(state.group.short_id);
  }
  renderAll();
  applyPermissions();
}

function renderAll() {
  const group = state.group || defaultLedger;
  const total = getTotalSaved();
  const percent = group.goal > 0 ? Math.min((total / group.goal) * 100, 100) : 0;

  els.nameInput.value = group.name;
  els.goalInput.value = group.goal;
  els.monthlyDueInput.value = group.monthly_due ?? group.monthlyDue;
  els.currencyInput.value = group.currency;
  els.groupTitle.textContent = group.name;
  els.groupSubtitle.textContent = getSubtitle();
  els.modeLabel.textContent = getModeLabel();
  els.totalSaved.textContent = formatMoney(total);
  els.goalText.textContent = `Goal: ${formatMoney(group.goal)}`;
  els.progressPercent.textContent = `${Math.round(percent)}%`;
  els.progressFill.style.width = `${percent}%`;
  els.memberCount.textContent = `${state.members.length} ${state.members.length === 1 ? "friend" : "friends"}`;
  els.entryCount.textContent = `${state.payments.length} ${state.payments.length === 1 ? "record" : "records"}`;
  els.roleLabel.textContent = state.user ? state.role : "Not signed in";
  els.sessionText.textContent = getSessionText();
  els.groupLinkText.textContent = state.group ? `Group ID: ${state.group.short_id}` : "Links appear after the tracker loads.";

  renderContributorOptions();
  renderMembers(total);
  renderMonthlyCheck();
  renderEntries();
}

function renderEmpty() {
  state.group = defaultLedger;
  state.members = [];
  state.payments = [];
  renderAll();
}

function renderContributorOptions() {
  const allowedMembers = canAdmin()
    ? state.members
    : state.members.filter((member) => member.id === state.groupMember?.member_id);

  if (!allowedMembers.length) {
    els.contributorInput.innerHTML = '<option value="">No member assigned</option>';
    return;
  }

  els.contributorInput.innerHTML = allowedMembers
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
  if (!state.members.length) {
    els.membersBody.innerHTML = '<tr><td class="empty-row" colspan="4">No members yet.</td></tr>';
    return;
  }

  els.membersBody.innerHTML = state.members
    .map((member) => {
      const contributed = getMemberTotal(member.id);
      const share = total > 0 ? Math.round((contributed / total) * 100) : 0;
      return `
        <tr>
          <td>${escapeHtml(member.name)}</td>
          <td class="amount">${formatMoney(contributed)}</td>
          <td>${share}%</td>
          <td class="edit-column">
            ${canAdmin() ? `<button class="delete-btn" type="button" data-delete-member="${escapeHtml(member.id)}">Remove</button>` : ""}
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderEntries() {
  if (!state.payments.length) {
    els.entriesBody.innerHTML = '<tr><td class="empty-row" colspan="4">No payments recorded yet.</td></tr>';
    return;
  }

  const memberNames = new Map(state.members.map((member) => [member.id, member.name]));
  els.entriesBody.innerHTML = [...state.payments]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((payment) => `
      <tr>
        <td>${formatMonth(payment.date)}</td>
        <td>${escapeHtml(memberNames.get(payment.memberId) || "Unknown")}</td>
        <td class="amount">${formatMoney(payment.amount)}</td>
        <td class="edit-column">
          ${
            canEditPayment(payment)
              ? `<button class="secondary mini-btn" type="button" data-edit-entry="${escapeHtml(payment.id)}">Edit</button>
                 <button class="delete-btn" type="button" data-delete-entry="${escapeHtml(payment.id)}">Delete</button>`
              : ""
          }
        </td>
      </tr>
    `)
    .join("");
}

function renderMonthlyCheck() {
  const month = els.monthlyMonthInput.value || getCurrentMonth();
  const expected = Number(state.group?.monthly_due ?? state.group?.monthlyDue ?? defaultLedger.monthlyDue);

  if (!state.members.length) {
    els.monthlySummary.innerHTML = "<span>0 paid</span><span>0 partial</span><span>0 unpaid</span>";
    els.monthlyCollected.textContent = formatMoney(0);
    els.monthlyTarget.textContent = formatMoney(0);
    els.monthlyProgressText.textContent = "0% paid";
    els.monthlyPeopleText.textContent = "0 of 0 members";
    els.monthlyProgressFill.style.width = "0%";
    els.monthlyBody.innerHTML = '<tr><td class="empty-row" colspan="5">No members to check.</td></tr>';
    return;
  }

  const rows = state.members.map((member) => {
    const monthEntries = state.payments.filter((payment) => payment.memberId === member.id && payment.date?.startsWith(month));
    const paid = monthEntries.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const lastPayment = monthEntries.map((payment) => payment.date).sort().pop();
    const status = getMonthlyStatus(paid, expected);
    return { member, paid, lastPayment, status };
  });

  const paidCount = rows.filter((row) => row.status.kind === "paid").length;
  const partialCount = rows.filter((row) => row.status.kind === "partial").length;
  const unpaidCount = rows.filter((row) => row.status.kind === "unpaid").length;
  const collected = rows.reduce((sum, row) => sum + row.paid, 0);
  const monthlyTarget = expected > 0 ? expected * state.members.length : collected;
  const amountProgress = monthlyTarget > 0 ? Math.min((collected / monthlyTarget) * 100, 100) : 0;

  els.monthlySummary.innerHTML = `
    <span>${paidCount} paid</span>
    <span>${partialCount} partial</span>
    <span>${unpaidCount} unpaid</span>
  `;
  els.monthlyCollected.textContent = formatMoney(collected);
  els.monthlyTarget.textContent = expected > 0 ? formatMoney(monthlyTarget) : "Set monthly amount";
  els.monthlyProgressText.textContent = `${Math.round(amountProgress)}% paid`;
  els.monthlyPeopleText.textContent = `${paidCount} of ${state.members.length} members`;
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

function applyPermissions() {
  const configured = state.configured;
  const signedIn = Boolean(state.user);
  const admin = canAdmin();
  const addPaymentAllowed = canAddPayment();
  const readonly = state.publicView || !configured;

  els.authPanel.hidden = state.publicView;
  els.setupPanel.hidden = configured;
  els.settingsForm.hidden = !admin;
  els.memberForm.hidden = !admin;
  els.sharePanel.hidden = !state.group || (!admin && !state.publicView);
  els.createGroupBtn.hidden = !signedIn || Boolean(state.group);
  els.signOutBtn.hidden = !signedIn;
  els.authForm.hidden = signedIn;
  els.contributionForm.hidden = !addPaymentAllowed;
  els.shareBtn.disabled = !state.group;
  els.copyAdminLinkBtn.hidden = !admin;
  els.copyMemberLinkBtn.hidden = !admin;
  els.copyViewLinkBtn.disabled = !state.group;
  els.refreshBtn.disabled = !configured;
  els.monthlyMonthInput.disabled = false;

  document.body.classList.toggle("readonly", readonly || state.role === "viewer");
  document.body.classList.toggle("admin", admin);
  document.body.classList.toggle("member", state.role === "member");
}

function getModeLabel() {
  if (state.publicView) return "View-only shared tracker";
  if (!state.user) return "Login required";
  if (!state.group) return "No tracker selected";
  return `${state.role} access`;
}

function getSubtitle() {
  if (state.publicView) return "This shared tracker is view-only.";
  if (!state.user) return "Sign in to view or update the savings tracker.";
  if (!state.group) return "Create or open a group link to begin.";
  if (canAdmin()) return "Admin can manage settings, members, and all payments.";
  if (state.role === "member") return "Members can add and manage only their own payments.";
  return "Viewers can see the tracker but cannot edit anything.";
}

function getSessionText() {
  if (!state.configured) return "Connect Supabase first.";
  if (!state.user) return "Use email and password to sign in or create an account.";
  if (!state.group) return `Signed in as ${state.user.email}. Create or open a tracker.`;
  return `Signed in as ${state.user.email}. Current role: ${state.role}.`;
}

function canAdmin() {
  return state.role === "admin";
}

function canAddPayment() {
  return Boolean(state.group) && (canAdmin() || (state.role === "member" && state.groupMember?.member_id));
}

function canEditPayment(payment) {
  if (canAdmin()) return true;
  return state.role === "member" && payment.createdBy === state.user?.id;
}

async function copyInviteLink(role) {
  if (!canAdmin()) return;
  const { data, error } = await state.supabase.rpc("create_group_invite", {
    p_group_id: state.group.id,
    p_role: role
  });
  if (error) {
    showToast(error.message);
    return;
  }
  await copyText(`${window.location.origin}${window.location.pathname}?g=${state.group.short_id}&invite=${data.token}`);
  showToast(`${role} invite link copied.`);
}

async function copyViewLink() {
  if (!state.group) return;
  await copyText(`${window.location.origin}${window.location.pathname}?g=${state.group.short_id}&view=${state.group.view_token}`);
  showToast("View-only link copied.");
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
}

function setUrlGroup(shortId) {
  window.history.replaceState(null, "", `${window.location.pathname}?g=${shortId}`);
}

function getMonthlyStatus(paid, expected) {
  if (expected > 0 && paid >= expected) return { kind: "paid", label: "Paid" };
  if (expected > 0 && paid > 0) return { kind: "partial", label: "Partial" };
  if (expected === 0 && paid > 0) return { kind: "paid", label: "Paid" };
  return { kind: "unpaid", label: "Unpaid" };
}

function getTotalSaved() {
  return state.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
}

function getMemberTotal(memberId) {
  return state.payments
    .filter((payment) => payment.memberId === memberId)
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
}

function formatMoney(value) {
  const currency = state.group?.currency || defaultLedger.currency;
  const locale = currency === "IDR" ? "id-ID" : undefined;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "IDR" ? 0 : 2
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
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
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
  els.paymentMonthsGroup
    .querySelectorAll('input[name="paymentMonths"]')
    .forEach((input) => {
      input.checked = false;
    });
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 3600);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
