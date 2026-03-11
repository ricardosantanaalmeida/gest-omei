const apiBase = "http://localhost:5000";

function getRoleHeader() {
  const role = document.getElementById("role").value;
  return { "X-User-Role": role };
}

async function loadTransactions() {
  const res = await fetch(`${apiBase}/api/transactions`, {
    headers: getRoleHeader(),
  });
  const list = document.getElementById("transactions");
  list.innerHTML = "";

  if (!res.ok) {
    list.innerHTML = `<li style=\"color:red\">Erro: ${res.status} ${res.statusText}</li>`;
    return;
  }

  const data = await res.json();
  data.forEach((tx) => {
    const item = document.createElement("li");
    item.textContent = `${tx.id} | ${tx.date} | ${tx.description} | ${tx.amount} | ${tx.type} | ${tx.category}`;
    list.appendChild(item);
  });
}

async function loadSummary() {
  const res = await fetch(`${apiBase}/api/summary`, {
    headers: getRoleHeader(),
  });

  const output = document.getElementById("summary");
  if (!res.ok) {
    output.textContent = `Erro: ${res.status} ${res.statusText}`;
    return;
  }

  const data = await res.json();
  output.textContent = JSON.stringify(data, null, 2);
}

async function createTransaction(event) {
  event.preventDefault();

  const payload = {
    date: document.getElementById("date").value,
    description: document.getElementById("description").value,
    amount: Number(document.getElementById("amount").value),
    type: document.getElementById("type").value,
    category: document.getElementById("category").value,
  };

  const res = await fetch(`${apiBase}/api/transactions`, {
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

  alert("Transação criada com sucesso!");
  document.getElementById("transactionForm").reset();
  loadTransactions();
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
  data.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.id} | ${item.code} | ${item.name} | ${item.type}`;
    list.appendChild(li);
  });
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

document.getElementById("loadTransactions").addEventListener("click", loadTransactions);
document.getElementById("loadSummary").addEventListener("click", loadSummary);
document.getElementById("transactionForm").addEventListener("submit", createTransaction);

document.getElementById("loadCompanies").addEventListener("click", loadCompanies);
document.getElementById("companyForm").addEventListener("submit", createCompany);

document.getElementById("loadCustomers").addEventListener("click", loadCustomers);
document.getElementById("customerForm").addEventListener("submit", createCustomer);

document.getElementById("loadUsers").addEventListener("click", loadUsers);
document.getElementById("userForm").addEventListener("submit", createUser);

document.getElementById("loadAccountPlans").addEventListener("click", loadAccountPlans);
document.getElementById("accountPlanForm").addEventListener("submit", createAccountPlan);
