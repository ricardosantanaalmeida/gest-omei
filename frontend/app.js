// Base URL da API (backend). Atualize se a porta/host mudar.
const apiBase = "http://localhost:5000";

// Cria o cabeçalho X-User-Role usado para simular perfis de usuário.
function getRoleHeader() {
  const role = document.getElementById("role").value;
  return { "X-User-Role": role };
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
    li.textContent = `${item.id} | ${item.name} | ${item.cnpj}${tipoAtividade}`;
    list.appendChild(li);
  });
}

// Cria uma nova empresa enviando os dados para a API.
// Lê um arquivo e converte para Base64.
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result?.toString() ?? "");
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
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

  alert("Empresa criada com sucesso!");
  document.getElementById("companyForm").reset();
  loadCompanies();
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

  alert("Cliente/fornecedor criado com sucesso!");
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

  alert("Usuário criado com sucesso!");
  document.getElementById("userForm").reset();
  loadUsers();
}

// Verifica se o perfil selecionado é Master.
function isMasterRole() {
  return document.getElementById("role").value === "Master";
}

// Atualiza o estado da UI baseado no perfil selecionado.
// Usuários sem privilégio Master não podem criar/editar plano de contas.
function updateUiForRole() {
  const isMaster = isMasterRole();

  // Apenas Master pode usar o formulário de alteração/criação.
  document.getElementById("planCode").disabled = !isMaster;
  document.getElementById("planName").disabled = !isMaster;
  document.getElementById("planType").disabled = !isMaster;
  document.querySelector("#accountPlanForm button[type=submit]").disabled = !isMaster;

  // Apenas Master vê o aviso de edição, mas todos podem carregar a lista.
  document.getElementById("accountPlanWarning").style.display = isMaster ? "none" : "block";
  document.getElementById("loadAccountPlans").disabled = false;
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

  alert("Plano de contas criado com sucesso!");
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

document.getElementById("role").addEventListener("change", () => {
  updateUiForRole();
});

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
