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
  if (valid) {
    inputEl.classList.remove("invalid");
  } else {
    inputEl.classList.add("invalid");
  }
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

  filtered.forEach((item) => {
    const li = document.createElement("li");
    const status = item.isActive ? "✅ Ativa" : "❌ Inativa";
    li.innerHTML = `
      <span class="item-text" title="${item.name}">${item.id} | ${item.name} | ${item.cnpj || "—"} | ${status}</span>
      <span class="item-actions"></span>
    `;
    const actions = li.querySelector(".item-actions");

    if (canEdit()) {
      const btnEdit = document.createElement("button");
      btnEdit.className = "btn-edit btn-sm";
      btnEdit.textContent = "✏️ Editar";
      btnEdit.onclick = () => editCompany(item);
      actions.appendChild(btnEdit);
    }

    if (isMasterRole()) {
      const btnToggle = document.createElement("button");
      btnToggle.className = "btn-sm";
      btnToggle.textContent = item.isActive ? "🔴 Inativar" : "🟢 Reativar";
      btnToggle.onclick = () => changeCompanyActiveState(item.id, !item.isActive);
      actions.appendChild(btnToggle);

      const btnDel = document.createElement("button");
      btnDel.className = "btn-danger btn-sm";
      btnDel.textContent = "🗑️";
      btnDel.title = "Excluir";
      btnDel.onclick = () => deleteCompany(item.id, item.name);
      actions.appendChild(btnDel);
    }

    list.appendChild(li);
  });

  if (filtered.length === 0) {
    list.innerHTML = "<li style='color:#888; background:none; border:none;'>Nenhum registro encontrado.</li>";
  }
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

  const payload = {
    name: nameEl.value,
    cnpj: cnpjEl.value,
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
    logoBase64,
  };

  const res = await fetch(`${apiBase}/api/companies`, {
    method: "POST",
    headers: { ...getRoleHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) { showMessage("companyMessage", `Erro: ${res.status}`, true); return; }
  showMessage("companyMessage", "Empresa cadastrada com sucesso!");
  document.getElementById("companyForm").reset();
  loadCompanies();
}

function editCompany(item) {
  const tipoServico  = (item.tipoAtividade || "").includes("Servico")  ? "checked" : "";
  const tipoComercio = (item.tipoAtividade || "").includes("Comercio") ? "checked" : "";
  const tipoInd      = (item.tipoAtividade || "").includes("Industria") ? "checked" : "";
  const dataVal      = item.dataAbertura ? item.dataAbertura.substring(0,10) : "";

  openModal(`✏️ Editar Empresa — ${item.name}`, `
    <label>Nome: *<input type="text" id="eCompanyName" value="${item.name}" /></label>
    <label>CNPJ/CPF:<input type="text" id="eCompanyCnpj" value="${item.cnpj || ""}" /></label>
    <label>Endereço:<input type="text" id="eCompanyAddress" value="${item.address || ""}" /></label>
    <label>Telefone:<input type="text" id="eCompanyPhone" value="${item.phone || ""}" /></label>
    <label>E-mail:<input type="email" id="eCompanyEmail" value="${item.email || ""}" /></label>
    <label>Insc. Estadual:<input type="text" id="eCompanyIE" value="${item.inscricaoEstadual || ""}" /></label>
    <label>Insc. Municipal:<input type="text" id="eCompanyIM" value="${item.inscricaoMunicipal || ""}" /></label>
    <label>Responsável:<input type="text" id="eCompanyResp" value="${item.responsavel || ""}" /></label>
    <label>Data de Abertura:<input type="date" id="eCompanyData" value="${dataVal}" /></label>
    <label>Atividade Primária:<input type="text" id="eCompanyAP" value="${item.atividadePrimaria || ""}" /></label>
    <label>Atividades Secundárias:<input type="text" id="eCompanyAS" value="${item.atividadesSecundarias || ""}" /></label>
    <fieldset><legend>Tipo de Atividade</legend>
      <label><input type="checkbox" name="eTipoAtividade" value="Servico" ${tipoServico} /> Serviço</label>
      <label><input type="checkbox" name="eTipoAtividade" value="Comercio" ${tipoComercio} /> Comércio</label>
      <label><input type="checkbox" name="eTipoAtividade" value="Industria" ${tipoInd} /> Indústria</label>
    </fieldset>
  `, async () => {
    const tipoAtividade = Array.from(document.querySelectorAll("input[name='eTipoAtividade']:checked"))
      .map(el => el.value).join(",");
    const payload = {
      id: item.id,
      name: document.getElementById("eCompanyName").value,
      cnpj: document.getElementById("eCompanyCnpj").value,
      address: document.getElementById("eCompanyAddress").value,
      phone: document.getElementById("eCompanyPhone").value,
      email: document.getElementById("eCompanyEmail").value,
      inscricaoEstadual: document.getElementById("eCompanyIE").value,
      inscricaoMunicipal: document.getElementById("eCompanyIM").value,
      responsavel: document.getElementById("eCompanyResp").value,
      dataAbertura: document.getElementById("eCompanyData").value,
      atividadePrimaria: document.getElementById("eCompanyAP").value,
      atividadesSecundarias: document.getElementById("eCompanyAS").value,
      tipoAtividade,
      logoBase64: item.logoBase64 || "",
      isActive: item.isActive,
    };
    const res = await fetch(`${apiBase}/api/companies/${item.id}`, {
      method: "PUT",
      headers: { ...getRoleHeader(), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { alert(`Erro ao salvar: ${res.status}`); return; }
    closeModal();
    showMessage("companyMessage", "Empresa atualizada com sucesso!");
    loadCompanies();
  });
}

async function deleteCompany(id, name) {
  if (!confirm(`Excluir empresa "${name}"? Esta ação não pode ser desfeita.`)) return;
  const res = await fetch(`${apiBase}/api/companies/${id}`, {
    method: "DELETE",
    headers: getRoleHeader(),
  });
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

  filtered.forEach((item) => {
    const li = document.createElement("li");
    const tipo = item.isSupplier ? "Fornecedor" : "Cliente";
    li.innerHTML = `
      <span class="item-text">${item.id} | ${item.name} | ${item.document || "—"} | ${tipo}</span>
      <span class="item-actions"></span>
    `;
    const actions = li.querySelector(".item-actions");

    if (canEdit()) {
      const btnEdit = document.createElement("button");
      btnEdit.className = "btn-edit btn-sm";
      btnEdit.textContent = "✏️ Editar";
      btnEdit.onclick = () => editCustomer(item);
      actions.appendChild(btnEdit);

      const btnDel = document.createElement("button");
      btnDel.className = "btn-danger btn-sm";
      btnDel.textContent = "🗑️";
      btnDel.onclick = () => deleteCustomer(item.id, item.name);
      actions.appendChild(btnDel);
    }
    list.appendChild(li);
  });

  if (filtered.length === 0) {
    list.innerHTML = "<li style='color:#888; background:none; border:none;'>Nenhum registro encontrado.</li>";
  }
}

async function createCustomer(event) {
  event.preventDefault();
  const nameEl = document.getElementById("customerName");
  const docEl  = document.getElementById("customerDocument");
  const emailEl = document.getElementById("customerEmail");

  let ok = true;
  ok = setFieldValidity(nameEl, nameEl.value.trim() !== "") && ok;
  ok = setFieldValidity(docEl, validarDocumento(docEl.value)) && ok;
  ok = setFieldValidity(emailEl, validarEmail(emailEl.value)) && ok;
  if (!ok) return;

  const payload = {
    name: nameEl.value,
    document: docEl.value,
    email: emailEl.value,
    phone: document.getElementById("customerPhone").value,
    isSupplier: document.getElementById("customerIsSupplier").value === "true",
  };

  const res = await fetch(`${apiBase}/api/customersuppliers`, {
    method: "POST",
    headers: { ...getRoleHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) { showMessage("customerMessage", `Erro: ${res.status}`, true); return; }
  showMessage("customerMessage", "Cadastro salvo com sucesso!");
  document.getElementById("customerForm").reset();
  loadCustomers();
}

function editCustomer(item) {
  openModal(`✏️ Editar — ${item.name}`, `
    <label>Nome: *<input type="text" id="eCustName" value="${item.name}" /></label>
    <label>CPF/CNPJ:<input type="text" id="eCustDoc" value="${item.document || ""}" /></label>
    <label>E-mail:<input type="email" id="eCustEmail" value="${item.email || ""}" /></label>
    <label>Telefone:<input type="text" id="eCustPhone" value="${item.phone || ""}" /></label>
    <label>Tipo:
      <select id="eCustSupplier">
        <option value="false" ${!item.isSupplier ? "selected" : ""}>Cliente</option>
        <option value="true"  ${item.isSupplier  ? "selected" : ""}>Fornecedor</option>
      </select>
    </label>
  `, async () => {
    const payload = {
      id: item.id,
      name: document.getElementById("eCustName").value,
      document: document.getElementById("eCustDoc").value,
      email: document.getElementById("eCustEmail").value,
      phone: document.getElementById("eCustPhone").value,
      isSupplier: document.getElementById("eCustSupplier").value === "true",
    };
    const res = await fetch(`${apiBase}/api/customersuppliers/${item.id}`, {
      method: "PUT",
      headers: { ...getRoleHeader(), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { alert(`Erro ao salvar: ${res.status}`); return; }
    closeModal();
    showMessage("customerMessage", "Atualizado com sucesso!");
    loadCustomers();
  });
}

async function deleteCustomer(id, name) {
  if (!confirm(`Excluir "${name}"?`)) return;
  const res = await fetch(`${apiBase}/api/customersuppliers/${id}`, {
    method: "DELETE", headers: getRoleHeader(),
  });
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

  filtered.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="item-text">${item.id} | ${item.username} | ${item.fullName || "—"} | ${item.role}</span>
      <span class="item-actions"></span>
    `;
    const actions = li.querySelector(".item-actions");

    if (canEdit()) {
      const btnEdit = document.createElement("button");
      btnEdit.className = "btn-edit btn-sm";
      btnEdit.textContent = "✏️ Editar";
      btnEdit.onclick = () => editUser(item);
      actions.appendChild(btnEdit);
    }

    if (isMasterRole()) {
      const btnDel = document.createElement("button");
      btnDel.className = "btn-danger btn-sm";
      btnDel.textContent = "🗑️";
      btnDel.onclick = () => deleteUser(item.id, item.username);
      actions.appendChild(btnDel);
    }
    list.appendChild(li);
  });

  if (filtered.length === 0) {
    list.innerHTML = "<li style='color:#888; background:none; border:none;'>Nenhum registro encontrado.</li>";
  }
}

async function createUser(event) {
  event.preventDefault();
  const userEl  = document.getElementById("userUsername");
  const passEl  = document.getElementById("userPassword");
  const emailEl = document.getElementById("userEmail");

  let ok = true;
  ok = setFieldValidity(userEl, userEl.value.trim() !== "") && ok;
  ok = setFieldValidity(passEl, passEl.value.trim() !== "") && ok;
  ok = setFieldValidity(emailEl, validarEmail(emailEl.value)) && ok;
  if (!ok) return;

  const payload = {
    username: userEl.value,
    password: passEl.value,
    fullName: document.getElementById("userFullName").value,
    email: emailEl.value,
    role: document.getElementById("userRole").value,
  };

  const res = await fetch(`${apiBase}/api/users`, {
    method: "POST",
    headers: { ...getRoleHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) { showMessage("userMessage", `Erro: ${res.status}`, true); return; }
  showMessage("userMessage", "Usuário cadastrado com sucesso!");
  document.getElementById("userForm").reset();
  loadUsers();
}

function editUser(item) {
  openModal(`✏️ Editar Usuário — ${item.username}`, `
    <label>Login: *<input type="text" id="eUserUsername" value="${item.username}" /></label>
    <label>Nova Senha: <small>(deixe em branco para não alterar)</small><input type="password" id="eUserPassword" /></label>
    <label>Nome Completo:<input type="text" id="eUserFullName" value="${item.fullName || ""}" /></label>
    <label>E-mail:<input type="email" id="eUserEmail" value="${item.email || ""}" /></label>
    <label>Perfil:
      <select id="eUserRole">
        <option value="Master"  ${item.role === "Master"  ? "selected" : ""}>Master</option>
        <option value="Admin"   ${item.role === "Admin"   ? "selected" : ""}>Admin</option>
        <option value="User"    ${item.role === "User"    ? "selected" : ""}>User</option>
        <option value="Viewer"  ${item.role === "Viewer"  ? "selected" : ""}>Viewer</option>
      </select>
    </label>
  `, async () => {
    const payload = {
      id: item.id,
      username: document.getElementById("eUserUsername").value,
      password: document.getElementById("eUserPassword").value,
      fullName: document.getElementById("eUserFullName").value,
      email: document.getElementById("eUserEmail").value,
      role: document.getElementById("eUserRole").value,
    };
    const res = await fetch(`${apiBase}/api/users/${item.id}`, {
      method: "PUT",
      headers: { ...getRoleHeader(), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { alert(`Erro ao salvar: ${res.status}`); return; }
    closeModal();
    showMessage("userMessage", "Usuário atualizado com sucesso!");
    loadUsers();
  });
}

async function deleteUser(id, username) {
  if (!confirm(`Excluir usuário "${username}"?`)) return;
  const res = await fetch(`${apiBase}/api/users/${id}`, {
    method: "DELETE", headers: getRoleHeader(),
  });
  if (!res.ok) { showMessage("userMessage", `Erro: ${res.status}`, true); return; }
  showMessage("userMessage", "Usuário excluído.");
  loadUsers();
}

// ── PLANO DE CONTAS ────────────────────────────────────────────────────────────

function createAccountItem(account) {
  const level = account.code.split(".").length - 1;
  const li = document.createElement("li");
  li.style.paddingLeft = `${Math.min(level, 2) * 18 + 8}px`;
  li.innerHTML = `
    <span class="item-text">${account.code} — ${account.name} <em>(${account.type})</em></span>
    <span class="item-actions"></span>
  `;
  const actions = li.querySelector(".item-actions");

  if (canEditPlans()) {
    const btnEdit = document.createElement("button");
    btnEdit.className = "btn-edit btn-sm";
    btnEdit.textContent = "✏️";
    btnEdit.title = "Editar";
    btnEdit.onclick = () => editAccountPlan(account);
    actions.appendChild(btnEdit);

    const btnDel = document.createElement("button");
    btnDel.className = "btn-danger btn-sm";
    btnDel.textContent = "🗑️";
    btnDel.title = "Excluir";
    btnDel.onclick = () => deleteAccountPlan(account.id, account.name);
    actions.appendChild(btnDel);
  }
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

async function createAccountPlan(event) {
  event.preventDefault();
  const codeEl = document.getElementById("planCode");
  const nameEl = document.getElementById("planName");

  let ok = true;
  ok = setFieldValidity(codeEl, codeEl.value.trim() !== "") && ok;
  ok = setFieldValidity(nameEl, nameEl.value.trim() !== "") && ok;
  if (!ok) return;

  const payload = {
    code: codeEl.value,
    name: nameEl.value,
    type: document.getElementById("planType").value,
  };

  const res = await fetch(`${apiBase}/api/accountplans`, {
    method: "POST",
    headers: { ...getRoleHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) { showMessage("accountPlanMessage", `Erro: ${res.status}`, true); return; }
  showMessage("accountPlanMessage", "Plano cadastrado com sucesso!");
  document.getElementById("accountPlanForm").reset();
  loadAccountPlans();
}

function editAccountPlan(item) {
  openModal(`✏️ Editar Plano — ${item.code}`, `
    <label>Código: *<input type="text" id="ePlanCode" value="${item.code}" /></label>
    <label>Nome: *<input type="text" id="ePlanName" value="${item.name}" /></label>
    <label>Tipo:
      <select id="ePlanType">
        <option value="Receita" ${item.type === "Receita" ? "selected" : ""}>Receita</option>
        <option value="Despesa" ${item.type === "Despesa" ? "selected" : ""}>Despesa</option>
      </select>
    </label>
  `, async () => {
    const payload = {
      id: item.id,
      code: document.getElementById("ePlanCode").value,
      name: document.getElementById("ePlanName").value,
      type: document.getElementById("ePlanType").value,
    };
    const res = await fetch(`${apiBase}/api/accountplans/${item.id}`, {
      method: "PUT",
      headers: { ...getRoleHeader(), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { alert(`Erro ao salvar: ${res.status}`); return; }
    closeModal();
    showMessage("accountPlanMessage", "Plano atualizado com sucesso!");
    loadAccountPlans();
  });
}

async function deleteAccountPlan(id, name) {
  if (!confirm(`Excluir plano "${name}"?`)) return;
  const res = await fetch(`${apiBase}/api/accountplans/${id}`, {
    method: "DELETE", headers: getRoleHeader(),
  });
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
  const master = isMasterRole();
  const plans  = canEditPlans();

  const disable = (id) => { const el = document.getElementById(id); if (el) el.disabled = true; };
  const enable  = (id) => { const el = document.getElementById(id); if (el) el.disabled = false; };

  const companyFields = ["companyName","companyCnpj","companyAddress","companyPhone","companyEmail",
    "companyInscricaoEstadual","companyInscricaoMunicipal","companyResponsavel","companyDataAbertura",
    "companyAtividadePrimaria","companyAtividadesSecundarias","companyLogo"];
  companyFields.forEach(edit ? enable : disable);
  document.querySelectorAll("input[name='companyTipoAtividade']").forEach(el => el.disabled = !edit);
  const companyBtn = document.querySelector("#companyForm button[type=submit]");
  if (companyBtn) companyBtn.disabled = !edit;

  const customerFields = ["customerName","customerDocument","customerEmail","customerPhone","customerIsSupplier"];
  customerFields.forEach(edit ? enable : disable);
  const custBtn = document.querySelector("#customerForm button[type=submit]");
  if (custBtn) custBtn.disabled = !edit;

  const userFields = ["userUsername","userPassword","userFullName","userEmail","userRole"];
  userFields.forEach(edit ? enable : disable);
  const userBtn = document.querySelector("#userForm button[type=submit]");
  if (userBtn) userBtn.disabled = !edit;

  const planFields = ["planCode","planName","planType"];
  planFields.forEach(plans ? enable : disable);
  const planBtn = document.querySelector("#accountPlanForm button[type=submit]");
  if (planBtn) planBtn.disabled = !plans;
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

  // Tabs principais
  document.querySelectorAll(".tab-bar > .tab-item > .tab").forEach(tab => {
    tab.classList.remove("active");
  });

  if (isCadastro) {
    document.getElementById("tabCadastroBtn").classList.add("active");
  } else {
    const tab = document.querySelector(`.tab[data-page="${pageId}"]`);
    if (tab) tab.classList.add("active");
  }

  // Itens do dropdown Cadastro
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
  pageLoaders[pageId]?.().catch(() => {});
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

// Botão "Cadastro" abre/fecha o dropdown
document.getElementById("tabCadastroBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  document.getElementById("tabCadastro").classList.toggle("open");
});

// Itens do dropdown Cadastro
document.querySelectorAll("#tabCadastroMenu button[data-page]").forEach(btn =>
  btn.addEventListener("click", () => showPage(btn.dataset.page))
);

// Tabs diretas (Movimento, Relatório, Ajuda)
document.querySelectorAll(".tab-bar > .tab-item > .tab[data-page]").forEach(btn =>
  btn.addEventListener("click", () => showPage(btn.dataset.page))
);

// Clique fora fecha o dropdown
document.addEventListener("click", (e) => {
  if (!document.getElementById("tabCadastro").contains(e.target)) {
    closeCadastroMenu();
  }
});

document.getElementById("role").addEventListener("change", () => {
  updateUiForRole();
  const activePage = document.querySelector(".page.active")?.id?.replace("page-", "") || "company";
  showPage(activePage);
});

// ── Init ──────────────────────────────────────────────────────────────────────
showPage("company");
updateUiForRole();
