// Base URL da API (backend). Atualize se a porta/host mudar.
const apiBase = "http://localhost:5000";

// Retorna o papel selecionado no frontend (X-User-Role).
function getSelectedRole() {
  return document.getElementById("role")?.value ?? "Master";
}

function getRoleHeader() {
  return { "X-User-Role": getSelectedRole() };
}

async function updateRoleInfo() {
  const role = getSelectedRole();
  const info = document.getElementById("roleInfo");

  const descriptions = {
    Master: "Master: pode criar/editar/excluir todos os cadastros e planos.",
    Admin: "Admin: pode criar/editar cadastros, mas não altera o plano de contas.",
    User: "User: pode visualizar cadastros, mas não criar nem editar.",
    Viewer: "Viewer: somente visualização de cadastros.",
  };

  info.textContent = descriptions[role] ?? "Perfil desconhecido.";
  info.style.display = "block";

  // Chama a API para confirmar o perfil reconhecido pelo backend
  // e exibir as permissões reais (útil para depuração).
  try {
    const res = await fetch(`${apiBase}/api/me`, {
      headers: getRoleHeader(),
    });

    if (!res.ok) {
      return;
    }

    const data = await res.json();
    info.textContent += ` (API reconhece: ${data.role})`;
  } catch (err) {
    // Silencioso: problema de conexão não bloqueia a UI.
  }
}

// Carrega a lista de empresas do backend e atualiza a tela.
async function changeCompanyActiveState(companyId, activate) {
  const url = `${apiBase}/api/companies/${companyId}/${activate ? "activate" : "inactivate"}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...getRoleHeader(),
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    alert(`Erro ao ${activate ? "reativar" : "inativar"}: ${res.status} ${res.statusText}`);
    return;
  }

  loadCompanies();
}

async function createCompany(event) {
  event.preventDefault();

  const atividadeTipos = Array.from(document.querySelectorAll("input[name='companyTipoAtividade']:checked"))
    .map((el) => el.value)
    .join(",");

  const logoFile = document.getElementById("companyLogo").files?.[0];
  const logoBase64 = logoFile ? await readFileAsBase64(logoFile) : "";

  const payload = {
    name: document.getElementById("companyName").value,
    cnpj: document.getElementById("companyCnpj").value,
    address: document.getElementById("companyAddress").value,
    phone: document.getElementById("companyPhone").value,
    email: document.getElementById("companyEmail").value,
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
    headers: {
      ...getRoleHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    alert(`Erro: ${res.status} ${res.statusText}`);
    return;
  }

  showMessage("companyMessage", "Cadastro salvo com sucesso!");
  document.getElementById("companyForm").reset();
  loadCompanies();
}

// Carrega a lista de empresas do backend e atualiza a tela.
async function loadCompanies() {
  const res = await fetch(`${apiBase}/api/companies`, {
    headers: getRoleHeader(),
  });

  const list = document.getElementById("companies");
  list.innerHTML = "";

  if (!res.ok) {
    list.innerHTML = `<li style=\"color:red\">Erro: ${res.status} ${res.statusText}</li>`;
    return;
  }

  const data = await res.json();
  data.forEach((item) => {
    const li = document.createElement("li");
    const tipoAtividade = item.tipoAtividade ? ` | Tipo: ${item.tipoAtividade}` : "";
    const status = item.isActive ? "Ativa" : "Inativa";
    li.textContent = `${item.id} | ${item.name} | ${item.cnpj} | ${status}${tipoAtividade}`;

    if (isMasterRole()) {
      const btn = document.createElement("button");
      btn.style.marginLeft = "0.5rem";

      if (item.isActive) {
        btn.textContent = "Inativar";
        btn.addEventListener("click", () => changeCompanyActiveState(item.id, false));
      } else {
        btn.textContent = "Reativar";
        btn.addEventListener("click", () => changeCompanyActiveState(item.id, true));
      }

      li.appendChild(btn);
    }

    list.appendChild(li);
  });
}

// Exibe uma mensagem temporária no front para o usuário.
function showMessage(elementId, text) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = text;
  el.style.display = "block";

  setTimeout(() => {
    el.style.display = "none";
  }, 3500);
}

// Lê um arquivo e converte para Base64.
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result?.toString() ?? "");
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Carrega a lista de clientes/fornecedores do backend.
async function loadCustomers() {
  const res = await fetch(`${apiBase}/api/customersuppliers`, {
    headers: getRoleHeader(),
  });

  const list = document.getElementById("customers");
  list.innerHTML = "";

  if (!res.ok) {
    list.innerHTML = `<li style=\"color:red\">Erro: ${res.status} ${res.statusText}</li>`;
    return;
  }

  const data = await res.json();
  data.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.id} | ${item.name} | ${item.document} | ${item.isSupplier ? "Fornecedor" : "Cliente"}`;
    list.appendChild(li);
  });
}

// Cria um novo cliente/fornecedor via API.
async function createCustomer(event) {
  event.preventDefault();

  const payload = {
    name: document.getElementById("customerName").value,
    document: document.getElementById("customerDocument").value,
    email: document.getElementById("customerEmail").value,
    phone: document.getElementById("customerPhone").value,
    isSupplier: document.getElementById("customerIsSupplier").value === "true",
  };

  const res = await fetch(`${apiBase}/api/customersuppliers`, {
    method: "POST",
    headers: {
      ...getRoleHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    alert(`Erro: ${res.status} ${res.statusText}`);
    return;
  }

  showMessage("customerMessage", "Cadastro salvo com sucesso!");
  document.getElementById("customerForm").reset();
  loadCustomers();
}

// Carrega a lista de usuários do backend.
async function loadUsers() {
  const res = await fetch(`${apiBase}/api/users`, {
    headers: getRoleHeader(),
  });

  const list = document.getElementById("users");
  list.innerHTML = "";

  if (!res.ok) {
    list.innerHTML = `<li style=\"color:red\">Erro: ${res.status} ${res.statusText}</li>`;
    return;
  }

  const data = await res.json();
  data.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.id} | ${item.username} | ${item.fullName} | ${item.role}`;
    list.appendChild(li);
  });
}

// Cria um novo usuário via API.
async function createUser(event) {
  event.preventDefault();

  const payload = {
    username: document.getElementById("userUsername").value,
    password: document.getElementById("userPassword").value,
    fullName: document.getElementById("userFullName").value,
    email: document.getElementById("userEmail").value,
    role: document.getElementById("userRole").value,
  };

  const res = await fetch(`${apiBase}/api/users`, {
    method: "POST",
    headers: {
      ...getRoleHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    alert(`Erro: ${res.status} ${res.statusText}`);
    return;
  }

  showMessage("userMessage", "Cadastro salvo com sucesso!");
  document.getElementById("userForm").reset();
  loadUsers();
}

function isMasterRole() {
  return getSelectedRole() === "Master";
}

function isAdminRole() {
  return getSelectedRole() === "Admin";
}

function canEditCompanies() {
  return isMasterRole() || isAdminRole();
}

function canEditUsers() {
  return isMasterRole() || isAdminRole();
}

function canEditAccountPlans() {
  return isMasterRole();
}

// Atualiza o estado da UI conforme o perfil selecionado.
function updateUiForRole() {
  const canEditPlans = canEditAccountPlans();
  const canEditUsersFlag = canEditUsers();
  const canEditCompaniesFlag = canEditCompanies();

  // Plano de contas (Master apenas)
  document.getElementById("planCode").disabled = !canEditPlans;
  document.getElementById("planName").disabled = !canEditPlans;
  document.getElementById("planType").disabled = !canEditPlans;
  document.querySelector("#accountPlanForm button[type=submit]").disabled = !canEditPlans;
  document.getElementById("accountPlanWarning").style.display = canEditPlans ? "none" : "block";

  // Usuário
  document.getElementById("userUsername").disabled = !canEditUsersFlag;
  document.getElementById("userPassword").disabled = !canEditUsersFlag;
  document.getElementById("userFullName").disabled = !canEditUsersFlag;
  document.getElementById("userEmail").disabled = !canEditUsersFlag;
  document.getElementById("userRole").disabled = !canEditUsersFlag;
  document.querySelector("#userForm button[type=submit]").disabled = !canEditUsersFlag;

  // Empresas
  document.getElementById("companyName").disabled = !canEditCompaniesFlag;
  document.getElementById("companyCnpj").disabled = !canEditCompaniesFlag;
  document.getElementById("companyAddress").disabled = !canEditCompaniesFlag;
  document.getElementById("companyPhone").disabled = !canEditCompaniesFlag;
  document.getElementById("companyEmail").disabled = !canEditCompaniesFlag;
  document.getElementById("companyInscricaoEstadual").disabled = !canEditCompaniesFlag;
  document.getElementById("companyInscricaoMunicipal").disabled = !canEditCompaniesFlag;
  document.getElementById("companyResponsavel").disabled = !canEditCompaniesFlag;
  document.getElementById("companyDataAbertura").disabled = !canEditCompaniesFlag;
  document.getElementById("companyAtividadePrimaria").disabled = !canEditCompaniesFlag;
  document.getElementById("companyAtividadesSecundarias").disabled = !canEditCompaniesFlag;
  document.querySelectorAll("input[name='companyTipoAtividade']").forEach((el) => (el.disabled = !canEditCompaniesFlag));
  document.getElementById("companyLogo").disabled = !canEditCompaniesFlag;
  document.querySelector("#companyForm button[type=submit]").disabled = !canEditCompaniesFlag;

  // Atualiza mensagem de perfil (informação adicional)
  updateRoleInfo().catch(() => {});
}

// Cria um item (linha) na lista de plano de contas, com recuo para níveis.
function createAccountItem(account) {
  const level = account.code.split(".").length - 1;
  const li = document.createElement("li");
  li.style.paddingLeft = `${Math.min(level, 2) * 18}px`;
  li.textContent = `${account.code} - ${account.name} (${account.type})`;
  return li;
}

// Carrega o plano de contas via API e insere na lista.
async function loadAccountPlans() {
  const res = await fetch(`${apiBase}/api/accountplans`, {
    headers: getRoleHeader(),
  });

  const list = document.getElementById("accountPlans");
  list.innerHTML = "";

  if (!res.ok) {
    list.innerHTML = `<li style=\"color:red\">Erro: ${res.status} ${res.statusText}</li>`;
    return;
  }

  const data = await res.json();
  data.forEach((item) => list.appendChild(createAccountItem(item)));
}

// Cria um novo plano de contas via API.
async function createAccountPlan(event) {
  event.preventDefault();

  const payload = {
    code: document.getElementById("planCode").value,
    name: document.getElementById("planName").value,
    type: document.getElementById("planType").value,
  };

  const res = await fetch(`${apiBase}/api/accountplans`, {
    method: "POST",
    headers: {
      ...getRoleHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    alert(`Erro: ${res.status} ${res.statusText}`);
    return;
  }

  showMessage("accountPlanMessage", "Cadastro salvo com sucesso!");
  document.getElementById("accountPlanForm").reset();
  loadAccountPlans();
}

document.getElementById("loadCompanies").addEventListener("click", loadCompanies);
document.getElementById("companyForm").addEventListener("submit", createCompany);

document.getElementById("loadCustomers").addEventListener("click", loadCustomers);
document.getElementById("customerForm").addEventListener("submit", createCustomer);

document.getElementById("loadUsers").addEventListener("click", loadUsers);
document.getElementById("userForm").addEventListener("submit", createUser);

document.getElementById("loadAccountPlans").addEventListener("click", loadAccountPlans);
document.getElementById("accountPlanForm").addEventListener("submit", createAccountPlan);

function setActiveNav(pageId) {
  document.querySelectorAll("nav button[data-page]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === pageId);
  });
}

function showPage(pageId) {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.toggle("active", page.id === `page-${pageId}`);
  });

  setActiveNav(pageId);
  toggleGroup("cadastro", pageId);

  const pageLoaders = {
    company: loadCompanies,
    customer: loadCustomers,
    user: loadUsers,
    accountplan: loadAccountPlans,
  };

  const loader = pageLoaders[pageId];
  if (loader) {
    loader().catch(() => {});
  }
}

function toggleGroup(groupName, pageId) {
  const groupItems = document.querySelector(`.nav-group-items[data-group="${groupName}"]`);
  const group = groupItems?.closest(".nav-group");
  if (!group || !groupItems) return;

  const shouldOpen = ["company", "user", "accountplan", "customer"].includes(pageId);
  groupItems.classList.toggle("open", shouldOpen);
  group.classList.toggle("open", shouldOpen);
}

// Conecta os botões do menu com a navegação de páginas.
document.querySelectorAll("nav [data-page]").forEach((button) => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

// Conecta o seletor de perfil para ajustar permissões em tempo real.
document.getElementById("role").addEventListener("change", () => {
  updateUiForRole();
  showPage(document.querySelector("nav button.active")?.dataset.page || "company");
});

// Conecta o botão do grupo (Cadastro) para abrir/fechar o submenu.
const groupToggles = document.querySelectorAll(".nav-group-toggle");
groupToggles.forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const groupName = toggle.dataset.group;
    const groupItems = document.querySelector(`.nav-group-items[data-group="${groupName}"]`);
    const group = toggle.closest(".nav-group");

    if (!groupItems || !group) return;

    const isOpen = groupItems.classList.toggle("open");
    group.classList.toggle("open", isOpen);
  });
});

// Define a página inicial que sempre será mostrada ao carregar.
showPage("company");

// Ajusta o estado da interface conforme o perfil selecionado.
updateUiForRole();
