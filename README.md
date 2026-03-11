# gest-omei

Sistema de gestão para MEI (controle financeiro) - backend em C# + SQLite (API web).

## Estrutura inicial

- `backend/` - backend ASP.NET Core Minimal API
  - `Program.cs` - define endpoints e configura o banco SQLite
  - `Data/AppDbContext.cs` - contexto EF Core
  - `Models/Transaction.cs` - modelo de transação financeira
  - `Models/Company.cs` - dados da empresa (MEI)
  - `Models/CustomerSupplier.cs` - clientes e fornecedores
  - `Models/User.cs` - usuários que podem acessar o sistema
  - `Models/AccountPlan.cs` - plano de contas (categorias financeiras)

## Endpoints principais (menu CADASTRO)

- `GET /api/companies` / `POST /api/companies`
- `GET /api/customersuppliers` / `POST /api/customersuppliers`
- `GET /api/users` / `POST /api/users`
- `GET /api/accountplans` / `POST /api/accountplans`

## Como usar (no seu computador)

1) Instale o .NET SDK (recomendado .NET 8 LTS):
   https://dotnet.microsoft.com/en-us/download

2) Na pasta do projeto, rode:
   - `dotnet restore ./backend/gest-omei.api.csproj`
   - `dotnet run --project ./backend/gest-omei.api.csproj`

3) A API vai rodar em `https://localhost:5001` (ou `http://localhost:5000`).
   - Swagger UI: `https://localhost:5001/swagger`

### Como testar com perfis (roles)

As rotas esperam um header HTTP chamado `X-User-Role` que define o perfil de quem está acessando.
Valores possíveis:

- `Master` (acesso total)
- `Admin` (cadastros e administração)
- `User` (lançar/editar transações e ver relatórios)
- `Viewer` (só consulta)

> ⚠️ Por enquanto, isto é apenas um exemplo simples: o sistema confia no valor do header para decidir se você pode usar a rota.

No Swagger, clique em "Try it out" e adicione o header em "Headers".

## Próximos passos

- Adicionar autenticação (login/usuário)
- Criar rotas para clientes, categorias, relatórios
- Criar UI com HTML/JS que consuma a API

## Front-end de exemplo (sem CSS)

Criei uma página simples em `frontend/index.html` que usa `frontend/app.js` para chamar a API.

> ✅ O back-end já cria automaticamente um usuário **Master** (login/senha: `master/master`) na primeira vez que roda.

### Como usar

1) Rode o backend:
   ```powershell
   dotnet run --project .\backend\gest-omei.api.csproj
   ```
2) Abra em seu navegador:
   - `file:///<caminho para o projeto>/frontend/index.html`

> Se você abrir o HTML diretamente e não funcionar, rode um servidor local simples com Python ou Node.

### Servidor simples com Python (se tiver Python instalado)

```powershell
cd frontend
python -m http.server 8000
```

Então acesse:
- `http://localhost:8000`

### Como testar perfis (roles)

No front, escolha o perfil em “Perfil (X-User-Role)”. Ele envia o header para a API e permite testar:
- `Master` (acesso total / único que altera plano de contas)
- `Admin` (cadastra dados de empresa/cliente/usuário)
- `User` (lança transações e vê relatórios)
- `Viewer` (consulta apenas)
