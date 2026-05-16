const apiBase = "http://localhost:5000";

// ── Perfil ──────────────────────────────────────────────────────────────────

function getSelectedRole() {
  return document.getElementById("role")?.value ?? "Master";
}

function getRoleHeader() {
  return { "X-User-Role": getSelectedRole() };
}

function isMasterRole()  { return getSelectedRole() === "Master"; }
function isAdminRole()   { return getSelectedRole() === "Admin"; }
function canEdit()       { return isMasterRole() || isAdminRole(); }
function canEditPlans()  { return isMasterRole(); }

// ── Validações ──────────────────────────────────────────────────────────────

function validarCPF(cpf) {
  const n = cpf.replace(/\D/g, "");
  if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += +n[i] * (10 - i);
  let r = (s * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== +n[9]) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += +n[i] * (11 - i);
  r = (s * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === +n[10];
}

function validarCNPJ(cnpj) {
  const n = cnpj.replace(/\D/g, "");
  if (n.length !== 14 || /^(\d)\1+$/.test(n)) return false;
  const calc = (len) => {
    let s = 0, pos = len - 7;
    for (let i = len; i >= 1; i--) {
      s += +n[len - i] * pos--;
      if (pos < 2) pos = 9;
    }
    return s % 11 < 2 ? 0 : 11 - (s % 11);
  };
  return calc(12) === +n[12] && calc(13) === +n[13];
}

function validarDocumento(doc) {
  const n = doc.replace(/\D/g, "");
  if (n.length === 0) return true;
  if (n.length === 11) return validarCPF(doc);
  if (n.length === 14) return validarCNPJ(doc);
  return false;
}

function validarEmail(email) {
  return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setFieldValidity(inputEl, valid) {
  if (valid) inputEl.classList.remove("invalid");
  else       inputEl.classList.add("invalid");
  return valid;
}

// ── Mensagens ───────────────────────────────────────────────────────────────

function showMessage(id, text, isError = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = "message" + (isError ? " error" : "");
  el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, 4000);
}

// ── Utilitário ───────────────────────────────────────────────────────────────

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result?.toString() ?? "");
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function fmtDateTime(dt) {
  const d = new Date(dt);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ── Modal ────────────────────────────────────────────────────────────────────

function openModal(title, bodyHtml, onSave) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalBody").innerHTML = bodyHtml;
  document.getElementById("modalSaveBtn").onclick = onSave;
  document.getElementById("editModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("editModal").style.display = "none";
}

document.getElementById("editModal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("editModal")) closeModal();
});

// ── Modo de operação por cadastro ─────────────────────────────────────────────
// mode: 'consultar' | 'novo' | 'alterar' | 'excluir'
// selectedItem: registro atualmente selecionado na lista

const cadastroState = {
  company:     { mode: "consultar", selectedItem: null, editingId: null },
  customer:    { mode: "consultar", selectedItem: null, editingId: null },
  user:        { mode: "consultar", selectedItem: null, editingId: null },
  accountplan: { mode: "consultar", selectedItem: null, editingId: null },
};

const modeLabels = {
  consultar: "🔍 Modo Consultar — clique em um registro para visualizar.",
  novo:      "➕ Modo Novo — preencha o formulário e clique em Salvar.",
  alterar:   "✏️ Modo Alterar — selecione um registro na lista para editar.",
  excluir:   "🗑️ Modo Excluir — selecione um registro na lista para excluir.",
};

function setCadastroMode(key, mode) {
  const state = cadastroState[key];
  state.mode = mode;
  state.selectedItem = null;
  state.editingId = null;

  const prefix = key === "accountplan" ? "accountplan" : key;
  const msgKey = key === "accountplan" ? "accountPlanMessage" : `${key}Message`;

  // Atualiza botões ativos
  ["novo","consultar","alterar","excluir"].forEach(m => {
    const btn = document.getElementById(`${prefix}Btn${m.charAt(0).toUpperCase() + m.slice(1)}`);
    if (btn) btn.classList.toggle("active", m === mode);
  });

  // Info de modo
  const infoEl = document.getElementById(`${prefix}ModeInfo`);
  if (infoEl) {
    infoEl.textContent = modeLabels[mode] || "";
    infoEl.style.display = "block";
  }

  // Painéis
  const listPanel = document.getElementById(`${prefix}ListPanel`);
  const formPanel = document.getElementById(`${prefix}FormPanel`);

  const showList = mode !== "novo";
  const showForm = mode === "novo";

  if (listPanel) listPanel.style.display = showList ? "block" : "none";
  if (formPanel) {
    formPanel.style.display = showForm ? "block" : "none";
    if (showForm) resetForm(key);
  }

  if (showList) {
    const loader = pageLoaders[key];
    if (loader) loader().catch(() => {});
  }

  // Ajuste de label da senha ao entrar em novo
  if (key === "user") {
    const lbl = document.getElementById("userPasswordLabel");
    if (lbl) lbl.firstChild.textContent = mode === "novo" ? "Senha: * " : "Nova Senha: ";
    const passEl = document.getElementById("userPassword");
    if (passEl) passEl.required = mode === "novo";
  }
}

function resetForm(key) {
  const formIds = {
    company:     "companyForm",
    customer:    "customerForm",
    user:        "userForm",
    accountplan: "accountPlanForm",
  };
  const form = document.getElementById(formIds[key]);
  if (form) form.reset();
  if (key === "company") {
    document.querySelectorAll("input[name='companyTipoAtividade']").forEach(el => el.checked = false);
  }
}

// Tornar item selecionável na lista
function makeSelectable(li, item, key) {
  li.classList.add("selectable");
  li.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    const state = cadastroState[key];
    const mode  = state.mode;

    if (mode === "alterar") {
      state.selectedItem = item;
      state.editingId = item.id;
      // Desmarca outros
      document.querySelectorAll(`#${key === "accountplan" ? "accountPlans" : key + "s"} li`).forEach(l => l.classList.remove("selected"));
      li.classList.add("selected");
      openEditForm(key, item);
    } else if (mode === "excluir") {
      state.selectedItem = item;
      document.querySelectorAll(`#${key === "accountplan" ? "accountPlans" : key + "s"} li`).forEach(l => l.classList.remove("selected"));
      li.classList.add("selected");
      handleExcluir(key, item);
    }
  });
}

function openEditForm(key, item) {
  const prefix = key === "accountplan" ? "accountplan" : key;
  const formPanel = document.getElementById(`${prefix}FormPanel`);
  if (!formPanel) return;
  formPanel.style.display = "block";

  if (key === "company") fillCompanyForm(item);
  else if (key === "customer") fillCustomerForm(item);
  else if (key === "user") fillUserForm(item);
  else if (key === "accountplan") fillAccountPlanForm(item);

  const infoEl = document.getElementById(`${prefix}ModeInfo`);
  if (infoEl) infoEl.textContent = `✏️ Editando: ${item.name || item.username || item.code || ""}`;

  const submitBtn = document.getElementById(`${prefix}SubmitBtn`) || document.getElementById(`${key}SubmitBtn`);
  if (submitBtn) submitBtn.textContent = "💾 Salvar Alteração";
}

async function handleExcluir(key, item) {
  const name = item.name || item.username || item.code || String(item.id);
  const entityLabel = { company: "empresa", customer: "cliente/fornecedor", user: "usuário", accountplan: "plano de contas" }[key];
  if (!confirm(`Excluir ${entityLabel} "${name}"? Esta ação não pode ser desfeita.`)) {
    cadastroState[key].selectedItem = null;
    const listEl = document.getElementById(key === "accountplan" ? "accountPlans" : key + "s");
    listEl?.querySelectorAll("li").forEach(l => l.classList.remove("selected"));
    return;
  }
  const delFns = { company: deleteCompany, customer: deleteCustomer, user: deleteUser, accountplan: deleteAccountPlan };
  await delFns[key](item.id, name);
  setCadastroMode(key, "excluir");
}

// ── Auditoria ─────────────────────────────────────────────────────────────────

const auditEntityMap = {
  company:     "Empresa",
  customer:    "Cliente/Fornecedor",
  user:        "Usuário",
  accountplan: "Plano de Contas",
};

async function toggleAudit(key) {
  const prefix = key === "accountplan" ? "accountplan" : key;
  const panel = document.getElementById(`${prefix}AuditPanel`);
  if (!panel) return;
  const isVisible = panel.style.display !== "none";
  panel.style.display = isVisible ? "none" : "block";
  if (!isVisible) await loadAuditLog(key);
}

async function loadAuditLog(key) {
  const prefix = key === "accountplan" ? "accountplan" : key;
  const tbody = document.getElementById(`${prefix}AuditBody`);
  if (!tbody) return;

  const entity = encodeURIComponent(auditEntityMap[key]);
  const res = await fetch(`${apiBase}/api/auditlogs?entity=${entity}&limit=100`, { headers: getRoleHeader() });
  if (!res.ok) {
    tbody.innerHTML = `<tr><td colspan="4" class="audit-empty">Erro ao carregar histórico.</td></tr>`;
    return;
  }
  const data = await res.json();
  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="audit-empty">Nenhuma ação registrada.</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(r => `
    <tr>
      <td>${r.username}</td>
      <td>${r.activity}</td>
      <td>${r.entityName || r.company || "—"}</td>
      <td>${fmtDateTime(r.dateTime)}</td>
    </tr>
  `).join("");
}

// ── EMPRESA ──────────────────────────────────────────────────────────────────

async function loadCompanies() {
  const res = await fetch(`${apiBase}/api/companies`, { headers: getRoleHeader() });
  const list = document.getElementById("companies");
  list.innerHTML = "";
  if (!res.ok) { list.innerHTML = `<li style="color:red">Erro: ${res.status}</li>`; return; }

  const data = await res.json();
  const q = document.getElementById("companySearch").value.toLowerCase();
  const filtered = data.filter(i =>
    !q || i.name.toLowerCase().includes(q) || (i.cnpj || "").toLowerCase().includes(q)
  );

  const mode = cadastroState.company.mode;
  filtered.forEach((item) => {
    const li = document.createElement("li");
    const status = item.isActive ? "✅ Ativa" : "❌ Inativa";
    li.innerHTML = `
      <span class="item-text" title="${item.name}">${item.id} | ${item.name} | ${item.cnpj || "—"} | ${status}</span>
      <span class="item-actions"></span>
    `;
    const actions = li.querySelector(".item-actions");

    if (mode === "consultar") {
      if (canEdit()) {
        const btnEdit = document.createElement("button");
        btnEdit.className = "btn-edit btn-sm";
        btnEdit.textContent = "✏️ Editar";
        btnEdit.onclick = (e) => { e.stopPropagation(); setCadastroMode("company","alterar"); openEditForm("company", item); };
        actions.appendChild(btnEdit);
      }
      if (isMasterRole()) {
        const btnToggle = document.createElement("button");
        btnToggle.className = "btn-sm";
        btnToggle.textContent = item.isActive ? "🔴 Inativar" : "🟢 Reativar";
        btnToggle.onclick = (e) => { e.stopPropagation(); changeCompanyActiveState(item.id, !item.isActive); };
        actions.appendChild(btnToggle);

        const btnDel = document.createElement("button");
        btnDel.className = "btn-danger btn-sm";
        btnDel.textContent = "🗑️";
        btnDel.title = "Excluir";
        btnDel.onclick = (e) => { e.stopPropagation(); deleteCompany(item.id, item.name); };
        actions.appendChild(btnDel);
      }
    }

    makeSelectable(li, item, "company");
    list.appendChild(li);
  });

  if (filtered.length === 0) {
    list.innerHTML = "<li style='color:#888; background:none; border:none;'>Nenhum registro encontrado.</li>";
  }
}

function fillCompanyForm(item) {
  const f = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ""; };
  f("companyName", item.name);
  f("companyCnpj", item.cnpj);
  f("companyAddress", item.address);
  f("companyPhone", item.phone);
  f("companyEmail", item.email);
  f("companyInscricaoEstadual", item.inscricaoEstadual);
  f("companyInscricaoMunicipal", item.inscricaoMunicipal);
  f("companyResponsavel", item.responsavel);
  f("companyDataAbertura", item.dataAbertura ? item.dataAbertura.substring(0,10) : "");
  f("companyAtividadePrimaria", item.atividadePrimaria);
  f("companyAtividadesSecundarias", item.atividadesSecundarias);
  document.querySelectorAll("input[name='companyTipoAtividade']").forEach(el => {
    el.checked = (item.tipoAtividade || "").includes(el.value);
  });
}

async function createCompany(event) {
  event.preventDefault();
  const nameEl  = document.getElementById("companyName");
  const cnpjEl  = document.getElementById("companyCnpj");
  const emailEl = document.getElementById("companyEmail");

  let ok = true;
  ok = setFieldValidity(nameEl, nameEl.value.trim() !== "") && ok;
  ok = setFieldValidity(cnpjEl, validarDocumento(cnpjEl.value)) && ok;
  ok = setFieldValidity(emailEl, validarEmail(emailEl.value)) && ok;
  if (!ok) return;

  const atividadeTipos = Array.from(document.querySelectorAll("input[name='companyTipoAtividade']:checked"))
    .map(el => el.value).join(",");
  const logoFile = document.getElementById("companyLogo").files?.[0];
  const logoBase64 = logoFile ? await readFileAsBase64(logoFile) : "";

  const state = cadastroState.company;
  const isAlter = state.mode === "alterar" && state.editingId;

  const payload = {
    name: nameEl.value, cnpj: cnpjEl.value,
    address: document.getElementById("companyAddress").value,
    phone: document.getElementById("companyPhone").value,
    email: emailEl.value,
    inscricaoEstadual: document.getElementById("companyInscricaoEstadual").value,
    inscricaoMunicipal: document.getElementById("companyInscricaoMunicipal").value,
    responsavel: document.getElementById("companyResponsavel").value,
    dataAbertura: document.getElementById("companyDataAbertura").value,
    atividadePrimaria: document.getElementById("companyAtividadePrimaria").value,
    atividadesSecundarias: document.getElementById("companyAtividadesSecundarias").value,
    tipoAtividade: atividadeTipos,
    logoBase64: logoBase64 || (state.selectedItem?.logoBase64 ?? ""),
    isActive: state.selectedItem?.isActive ?? true,
  };

  let res;
  if (isAlter) {
    payload.id = state.editingId;
    res = await fetch(`${apiBase}/api/companies/${state.editingId}`, {
      method: "PUT",
      headers: { ...getRoleHeader(), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } else {
    res = await fetch(`${apiBase}/api/companies`, {
      method: "POST",
      headers: { ...getRoleHeader(), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  if (!res.ok) { showMessage("companyMessage", `Erro: ${res.status}`, true); return; }
  showMessage("companyMessage", isAlter ? "Empresa atualizada com sucesso!" : "Empresa cadastrada com sucesso!");
  setCadastroMode("company", "consultar");
}

async function deleteCompany(id, name) {
  if (!confirm(`Excluir empresa "${name}"? Esta ação não pode ser desfeita.`)) return;
  const res = await fetch(`${apiBase}/api/companies/${id}`, { method: "DELETE", headers: getRoleHeader() });
  if (!res.ok) { showMessage("companyMessage", `Erro ao excluir: ${res.status}`, true); return; }
  showMessage("companyMessage", "Empresa excluída.");
  loadCompanies();
}

async function changeCompanyActiveState(id, activate) {
  const url = `${apiBase}/api/companies/${id}/${activate ? "activate" : "inactivate"}`;
  const res = await fetch(url, { method: "POST", headers: getRoleHeader() });
  if (!res.ok) { alert(`Erro: ${res.status}`); return; }
  loadCompanies();
}

// ── CLIENTE/FORNECEDOR ────────────────────────────────────────────────────────

async function loadCustomers() {
  const res = await fetch(`${apiBase}/api/customersuppliers`, { headers: getRoleHeader() });
  const list = document.getElementById("customers");
  list.innerHTML = "";
  if (!res.ok) { list.innerHTML = `<li style="color:red">Erro: ${res.status}</li>`; return; }

  const data = await res.json();
  const q = document.getElementById("customerSearch").value.toLowerCase();
  const filtered = data.filter(i =>
    !q || i.name.toLowerCase().includes(q) || (i.document || "").toLowerCase().includes(q)
  );

  const mode = cadastroState.customer.mode;
  filtered.forEach((item) => {
    const li = document.createElement("li");
    const tipo = item.isSupplier ? "Fornecedor" : "Cliente";
    li.innerHTML = `
      <span class="item-text">${item.id} | ${item.name} | ${item.document || "—"} | ${tipo}</span>
      <span class="item-actions"></span>
    `;
    const actions = li.querySelector(".item-actions");

    if (mode === "consultar" && canEdit()) {
      const btnEdit = document.createElement("button");
      btnEdit.className = "btn-edit btn-sm";
      btnEdit.textContent = "✏️ Editar";
      btnEdit.onclick = (e) => { e.stopPropagation(); setCadastroMode("customer","alterar"); openEditForm("customer", item); };
      actions.appendChild(btnEdit);

      const btnDel = document.createElement("button");
      btnDel.className = "btn-danger btn-sm";
      btnDel.textContent = "🗑️";
      btnDel.onclick = (e) => { e.stopPropagation(); deleteCustomer(item.id, item.name); };
      actions.appendChild(btnDel);
    }

    makeSelectable(li, item, "customer");
    list.appendChild(li);
  });

  if (filtered.length === 0) {
    list.innerHTML = "<li style='color:#888; background:none; border:none;'>Nenhum registro encontrado.</li>";
  }
}

function fillCustomerForm(item) {
  document.getElementById("customerName").value      = item.name || "";
  document.getElementById("customerDocument").value  = item.document || "";
  document.getElementById("customerEmail").value     = item.email || "";
  document.getElementById("customerPhone").value     = item.phone || "";
  document.getElementById("customerIsSupplier").value = item.isSupplier ? "true" : "false";
}

async function createCustomer(event) {
  event.preventDefault();
  const nameEl  = document.getElementById("customerName");
  const docEl   = document.getElementById("customerDocument");
  const emailEl = document.getElementById("customerEmail");

  let ok = true;
  ok = setFieldValidity(nameEl, nameEl.value.trim() !== "") && ok;
  ok = setFieldValidity(docEl, validarDocumento(docEl.value)) && ok;
  ok = setFieldValidity(emailEl, validarEmail(emailEl.value)) && ok;
  if (!ok) return;

  const payload = {
    name: nameEl.value, document: docEl.value, email: emailEl.value,
    phone: document.getElementById("customerPhone").value,
    isSupplier: document.getElementById("customerIsSupplier").value === "true",
  };

  const state = cadastroState.customer;
  const isAlter = state.mode === "alterar" && state.editingId;

  let res;
  if (isAlter) {
    payload.id = state.editingId;
    res = await fetch(`${apiBase}/api/customersuppliers/${state.editingId}`, {
      method: "PUT", headers: { ...getRoleHeader(), "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
  } else {
    res = await fetch(`${apiBase}/api/customersuppliers`, {
      method: "POST", headers: { ...getRoleHeader(), "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
  }

  if (!res.ok) { showMessage("customerMessage", `Erro: ${res.status}`, true); return; }
  showMessage("customerMessage", isAlter ? "Atualizado com sucesso!" : "Cadastro salvo com sucesso!");
  setCadastroMode("customer", "consultar");
}

async function deleteCustomer(id, name) {
  if (!confirm(`Excluir "${name}"?`)) return;
  const res = await fetch(`${apiBase}/api/customersuppliers/${id}`, { method: "DELETE", headers: getRoleHeader() });
  if (!res.ok) { showMessage("customerMessage", `Erro: ${res.status}`, true); return; }
  showMessage("customerMessage", "Registro excluído.");
  loadCustomers();
}

// ── USUÁRIO ───────────────────────────────────────────────────────────────────

async function loadUsers() {
  const res = await fetch(`${apiBase}/api/users`, { headers: getRoleHeader() });
  const list = document.getElementById("users");
  list.innerHTML = "";
  if (!res.ok) { list.innerHTML = `<li style="color:red">Erro: ${res.status}</li>`; return; }

  const data = await res.json();
  const q = document.getElementById("userSearch").value.toLowerCase();
  const filtered = data.filter(i =>
    !q || i.username.toLowerCase().includes(q) || (i.fullName || "").toLowerCase().includes(q)
  );

  const mode = cadastroState.user.mode;
  filtered.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="item-text">${item.id} | ${item.username} | ${item.fullName || "—"} | ${item.role}</span>
      <span class="item-actions"></span>
    `;
    const actions = li.querySelector(".item-actions");

    if (mode === "consultar") {
      if (canEdit()) {
        const btnEdit = document.createElement("button");
        btnEdit.className = "btn-edit btn-sm";
        btnEdit.textContent = "✏️ Editar";
        btnEdit.onclick = (e) => { e.stopPropagation(); setCadastroMode("user","alterar"); openEditForm("user", item); };
        actions.appendChild(btnEdit);
      }
      if (isMasterRole()) {
        const btnDel = document.createElement("button");
        btnDel.className = "btn-danger btn-sm";
        btnDel.textContent = "🗑️";
        btnDel.onclick = (e) => { e.stopPropagation(); deleteUser(item.id, item.username); };
        actions.appendChild(btnDel);
      }
    }

    makeSelectable(li, item, "user");
    list.appendChild(li);
  });

  if (filtered.length === 0) {
    list.innerHTML = "<li style='color:#888; background:none; border:none;'>Nenhum registro encontrado.</li>";
  }
}

function fillUserForm(item) {
  document.getElementById("userUsername").value = item.username || "";
  document.getElementById("userPassword").value = "";
  document.getElementById("userFullName").value  = item.fullName || "";
  document.getElementById("userEmail").value     = item.email || "";
  document.getElementById("userRole").value      = item.role || "User";
}

async function createUser(event) {
  event.preventDefault();
  const userEl  = document.getElementById("userUsername");
  const passEl  = document.getElementById("userPassword");
  const emailEl = document.getElementById("userEmail");
  const state   = cadastroState.user;
  const isAlter = state.mode === "alterar" && state.editingId;

  let ok = true;
  ok = setFieldValidity(userEl, userEl.value.trim() !== "") && ok;
  if (!isAlter) ok = setFieldValidity(passEl, passEl.value.trim() !== "") && ok;
  ok = setFieldValidity(emailEl, validarEmail(emailEl.value)) && ok;
  if (!ok) return;

  const payload = {
    username: userEl.value, password: passEl.value,
    fullName: document.getElementById("userFullName").value,
    email: emailEl.value,
    role: document.getElementById("userRole").value,
  };

  let res;
  if (isAlter) {
    payload.id = state.editingId;
    res = await fetch(`${apiBase}/api/users/${state.editingId}`, {
      method: "PUT", headers: { ...getRoleHeader(), "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
  } else {
    res = await fetch(`${apiBase}/api/users`, {
      method: "POST", headers: { ...getRoleHeader(), "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
  }

  if (!res.ok) { showMessage("userMessage", `Erro: ${res.status}`, true); return; }
  showMessage("userMessage", isAlter ? "Usuário atualizado com sucesso!" : "Usuário cadastrado com sucesso!");
  setCadastroMode("user", "consultar");
}

async function deleteUser(id, username) {
  if (!confirm(`Excluir usuário "${username}"?`)) return;
  const res = await fetch(`${apiBase}/api/users/${id}`, { method: "DELETE", headers: getRoleHeader() });
  if (!res.ok) { showMessage("userMessage", `Erro: ${res.status}`, true); return; }
  showMessage("userMessage", "Usuário excluído.");
  loadUsers();
}

// ── PLANO DE CONTAS ────────────────────────────────────────────────────────────

function createAccountItem(account) {
  const level  = account.code.split(".").length - 1;
  const isSint = account.nature === "Sintética";
  const li     = document.createElement("li");
  li.style.paddingLeft = `${Math.min(level, 3) * 16 + 8}px`;
  if (isSint) li.style.background = "#F5F8FF";

  const typeTag   = account.type === "Receita"
    ? `<span style="color:#217346;font-weight:700;font-size:0.72rem">▲ Receita</span>`
    : `<span style="color:#C0392B;font-weight:700;font-size:0.72rem">▼ Despesa</span>`;
  const natureTag = isSint
    ? `<span style="background:#E8F1FB;color:#2B579A;font-size:0.68rem;font-weight:700;padding:1px 5px;border-radius:2px">Sintética</span>`
    : `<span style="background:#DFF0D8;color:#217346;font-size:0.68rem;font-weight:700;padding:1px 5px;border-radius:2px">Analítica</span>`;
  const codeStyle = isSint ? "font-weight:700" : "color:#555";

  li.innerHTML = `
    <span class="item-text" style="${isSint ? "font-weight:600" : ""}">
      <span style="${codeStyle}">${account.code}</span>
      &nbsp;—&nbsp;${account.name}
      &nbsp; ${typeTag} &nbsp; ${natureTag}
    </span>
    <span class="item-actions"></span>
  `;
  const actions = li.querySelector(".item-actions");
  const mode = cadastroState.accountplan.mode;

  if (mode === "consultar" && canEditPlans()) {
    const btnEdit = document.createElement("button");
    btnEdit.className = "btn-edit btn-sm";
    btnEdit.textContent = "✏️";
    btnEdit.title = "Editar";
    btnEdit.onclick = (e) => { e.stopPropagation(); setCadastroMode("accountplan","alterar"); openEditForm("accountplan", account); };
    actions.appendChild(btnEdit);

    const btnDel = document.createElement("button");
    btnDel.className = "btn-danger btn-sm";
    btnDel.textContent = "🗑️";
    btnDel.title = "Excluir";
    btnDel.onclick = (e) => { e.stopPropagation(); deleteAccountPlan(account.id, account.name); };
    actions.appendChild(btnDel);
  }

  makeSelectable(li, account, "accountplan");
  return li;
}

async function loadAccountPlans() {
  const res = await fetch(`${apiBase}/api/accountplans`, { headers: getRoleHeader() });
  const list = document.getElementById("accountPlans");
  list.innerHTML = "";
  if (!res.ok) { list.innerHTML = `<li style="color:red">Erro: ${res.status}</li>`; return; }

  const data = await res.json();
  const q = document.getElementById("planSearch").value.toLowerCase();
  const filtered = data.filter(i =>
    !q || i.code.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)
  );
  filtered.forEach((item) => list.appendChild(createAccountItem(item)));

  if (filtered.length === 0) {
    list.innerHTML = "<li style='color:#888; background:none; border:none;'>Nenhum registro encontrado.</li>";
  }
}

function fillAccountPlanForm(item) {
  document.getElementById("planCode").value   = item.code || "";
  document.getElementById("planName").value   = item.name || "";
  document.getElementById("planType").value   = item.type || "Receita";
  document.getElementById("planNature").value = item.nature || "Analítica";
}

async function createAccountPlan(event) {
  event.preventDefault();
  const codeEl = document.getElementById("planCode");
  const nameEl = document.getElementById("planName");

  let ok = true;
  ok = setFieldValidity(codeEl, codeEl.value.trim() !== "") && ok;
  ok = setFieldValidity(nameEl, nameEl.value.trim() !== "") && ok;
  if (!ok) return;

  const payload = {
    code: codeEl.value, name: nameEl.value,
    type: document.getElementById("planType").value,
    nature: document.getElementById("planNature").value,
  };

  const state = cadastroState.accountplan;
  const isAlter = state.mode === "alterar" && state.editingId;

  let res;
  if (isAlter) {
    payload.id = state.editingId;
    res = await fetch(`${apiBase}/api/accountplans/${state.editingId}`, {
      method: "PUT", headers: { ...getRoleHeader(), "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
  } else {
    res = await fetch(`${apiBase}/api/accountplans`, {
      method: "POST", headers: { ...getRoleHeader(), "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
  }

  if (!res.ok) { showMessage("accountPlanMessage", `Erro: ${res.status}`, true); return; }
  showMessage("accountPlanMessage", isAlter ? "Plano atualizado com sucesso!" : "Plano cadastrado com sucesso!");
  setCadastroMode("accountplan", "consultar");
}

async function deleteAccountPlan(id, name) {
  if (!confirm(`Excluir plano "${name}"?`)) return;
  const res = await fetch(`${apiBase}/api/accountplans/${id}`, { method: "DELETE", headers: getRoleHeader() });
  if (!res.ok) { showMessage("accountPlanMessage", `Erro: ${res.status}`, true); return; }
  showMessage("accountPlanMessage", "Plano excluído.");
  loadAccountPlans();
}

// ── UI por perfil ─────────────────────────────────────────────────────────────

async function updateRoleInfo() {
  const role = getSelectedRole();
  const info = document.getElementById("roleInfo");
  const desc = {
    Master:  "Master — acesso total: criar, editar, excluir e gerenciar planos.",
    Admin:   "Admin — pode criar/editar cadastros. Não pode excluir empresas/usuários nem alterar plano de contas.",
    User:    "User — somente visualização dos cadastros.",
    Viewer:  "Viewer — somente visualização.",
  };
  info.textContent = desc[role] ?? "Perfil desconhecido.";
  info.style.display = "block";
}

function updateUiForRole() {
  const edit   = canEdit();
  const plans  = canEditPlans();

  ["companyBtnNovo","companyBtnAlterar","companyBtnExcluir"].forEach(id => {
    const el = document.getElementById(id); if (el) el.disabled = !edit;
  });
  ["customerBtnNovo","customerBtnAlterar","customerBtnExcluir"].forEach(id => {
    const el = document.getElementById(id); if (el) el.disabled = !edit;
  });
  ["userBtnNovo","userBtnAlterar","userBtnExcluir"].forEach(id => {
    const el = document.getElementById(id); if (el) el.disabled = !edit;
  });
  ["accountplanBtnNovo","accountplanBtnAlterar","accountplanBtnExcluir"].forEach(id => {
    const el = document.getElementById(id); if (el) el.disabled = !plans;
  });

  const planWarn = document.getElementById("accountPlanWarning");
  if (planWarn) planWarn.style.display = plans ? "none" : "block";

  updateRoleInfo();
}

// ── Navegação ─────────────────────────────────────────────────────────────────

const cadastroPages = ["company", "user", "accountplan", "customer"];

const pageLoaders = {
  company:     loadCompanies,
  customer:    loadCustomers,
  user:        loadUsers,
  accountplan: loadAccountPlans,
};

function setActiveTab(pageId) {
  const isCadastro = cadastroPages.includes(pageId);
  document.querySelectorAll(".tab-bar > .tab-item > .tab").forEach(tab => tab.classList.remove("active"));
  if (isCadastro) {
    document.getElementById("tabCadastroBtn").classList.add("active");
  } else {
    const tab = document.querySelector(`.tab[data-page="${pageId}"]`);
    if (tab) tab.classList.add("active");
  }
  document.querySelectorAll("#tabCadastroMenu button").forEach(btn =>
    btn.classList.toggle("active", btn.dataset.page === pageId)
  );
}

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p =>
    p.classList.toggle("active", p.id === `page-${pageId}`)
  );
  setActiveTab(pageId);
  closeCadastroMenu();
  if (cadastroPages.includes(pageId)) {
    setCadastroMode(pageId, cadastroState[pageId]?.mode || "consultar");
  }
}

function closeCadastroMenu() {
  document.getElementById("tabCadastro").classList.remove("open");
}

// ── Event listeners ───────────────────────────────────────────────────────────

document.getElementById("companyForm").addEventListener("submit", createCompany);
document.getElementById("customerForm").addEventListener("submit", createCustomer);
document.getElementById("userForm").addEventListener("submit", createUser);
document.getElementById("accountPlanForm").addEventListener("submit", createAccountPlan);

document.getElementById("companySearch").addEventListener("input", loadCompanies);
document.getElementById("customerSearch").addEventListener("input", loadCustomers);
document.getElementById("userSearch").addEventListener("input", loadUsers);
document.getElementById("planSearch").addEventListener("input", loadAccountPlans);

document.getElementById("tabCadastroBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  document.getElementById("tabCadastro").classList.toggle("open");
});

document.querySelectorAll("#tabCadastroMenu button[data-page]").forEach(btn =>
  btn.addEventListener("click", () => showPage(btn.dataset.page))
);

document.querySelectorAll(".tab-bar > .tab-item > .tab[data-page]").forEach(btn =>
  btn.addEventListener("click", () => showPage(btn.dataset.page))
);

document.addEventListener("click", (e) => {
  if (!document.getElementById("tabCadastro").contains(e.target)) closeCadastroMenu();
});

document.getElementById("role").addEventListener("change", () => {
  updateUiForRole();
  const activePage = document.querySelector(".page.active")?.id?.replace("page-", "") || "company";
  showPage(activePage);
});

// ── Init ──────────────────────────────────────────────────────────────────────
showPage("company");
updateUiForRole();
