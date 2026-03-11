const apiBase = "http://localhost:5000";

function getRoleHeader() {
  const role = document.getElementById("role").value;
  return { "X-User-Role": role };
}

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
    li.textContent = `${item.id} | ${item.name} | ${item.cnpj} | ${item.email}`;
    list.appendChild(li);
  });
}

async function createCompany(event) {
  event.preventDefault();

  const payload = {
    name: document.getElementById("companyName").value,
    cnpj: document.getElementById("companyCnpj").value,
    address: document.getElementById("companyAddress").value,
    phone: document.getElementById("companyPhone").value,
    email: document.getElementById("companyEmail").value,
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

function isMasterRole() {
  return document.getElementById("role").value === "Master";
}

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

function createAccountItem(account) {
  const level = account.code.split(".").length - 1;
  const li = document.createElement("li");
  li.style.paddingLeft = `${Math.min(level, 2) * 18}px`;
  li.textContent = `${account.code} - ${account.name} (${account.type})`;
  return li;
}

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
  dropdown?.classList.remove("open");

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

const dropdown = document.querySelector(".dropdown");
const dropdownToggle = document.querySelector(".dropdown-toggle");

dropdownToggle.addEventListener("click", () => {
  dropdown.classList.toggle("open");
});

document.addEventListener("click", (event) => {
  if (!dropdown.contains(event.target)) {
    dropdown.classList.remove("open");
  }
});

// Wire navigation buttons
document.querySelectorAll("nav [data-page]").forEach((button) => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

// Initial page
showPage("company");

updateUiForRole();
