# gest-omei

Sistema de gestão para MEI (controle financeiro) - backend em C# + SQLite (API web).

## Estrutura inicial

- `backend/` - backend ASP.NET Core Minimal API
  - `Program.cs` - define endpoints e configura o banco SQLite
  - `Data/AppDbContext.cs` - contexto EF Core
  - `Models/Transaction.cs` - modelo de transação financeira

## Como usar (no seu computador)

1) Instale o .NET SDK (recomendado .NET 8 LTS):
   https://dotnet.microsoft.com/en-us/download

2) Na pasta do projeto, rode:
   - `dotnet restore ./backend/gest-omei.api.csproj`
   - `dotnet run --project ./backend/gest-omei.api.csproj`

3) A API vai rodar em `https://localhost:5001` (ou `http://localhost:5000`).
   - Swagger UI: `https://localhost:5001/swagger`

## Próximos passos

- Adicionar autenticação (login/usuário)
- Criar rotas para clientes, categorias, relatórios
- Criar UI com HTML/CSS/JS que consuma a API
