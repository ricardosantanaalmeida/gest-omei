using GestOmei.Api.Data; // Usa o contexto do banco (AppDbContext)
using GestOmei.Api.Models; // Usa o modelo Transaction e TransactionType
using Microsoft.EntityFrameworkCore; // Para configurar o EF Core e o SQLite

var builder = WebApplication.CreateBuilder(args); // Cria o construtor da aplicação (configuração + serviços)

// Registra o contexto do banco (AppDbContext) usando SQLite.
// Se a conexão não estiver configurada, usa o arquivo local gestomei.db.
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=gestomei.db"));

builder.Services.AddEndpointsApiExplorer(); // Permite gerar documentação (Swagger)
builder.Services.AddSwaggerGen(); // Gera a documentação interativa de APIs

var app = builder.Build(); // Constrói a aplicação com os serviços configurados

// Cria o arquivo do banco de dados SQLite automaticamente na primeira execução.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated(); // Cria o banco se não existir
}

// No modo desenvolvimento, habilita o Swagger (página de testes da API)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Helper simples para verificar o perfil do usuário via header HTTP "X-User-Role".
// Exemplo de header: X-User-Role: Admin
static UserRole? GetUserRole(HttpRequest request)
{
    if (!request.Headers.TryGetValue("X-User-Role", out var values))
        return null;

    var roleString = values.ToString();
    return Enum.TryParse<UserRole>(roleString, true, out var role) ? role : null;
}

static IResult? RequireRole(HttpRequest request, params UserRole[] allowedRoles)
{
    var role = GetUserRole(request);
    if (role is null) return Results.Unauthorized();
    return allowedRoles.Contains(role.Value) ? null : Results.Forbid();
}

// Rota: obter todas as transações (qualquer perfil pode consultar)
app.MapGet("/api/transactions", async (AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin, UserRole.User, UserRole.Viewer) is IResult notAllowed) return notAllowed;
    return Results.Ok(await db.Transactions.AsNoTracking().ToListAsync());
});

// Rota: obter uma transação por ID
app.MapGet("/api/transactions/{id:int}", async (int id, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin, UserRole.User, UserRole.Viewer) is IResult notAllowed) return notAllowed;
    return await db.Transactions.FindAsync(id) is Transaction tx ? Results.Ok(tx) : Results.NotFound();
});

// Rota: criar uma nova transação
app.MapPost("/api/transactions", async (Transaction transaction, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin, UserRole.User) is IResult notAllowed) return notAllowed;

    // Se a data não for enviada, usa a data/hora atual
    transaction.Date = transaction.Date == default ? DateTime.UtcNow : transaction.Date;
    db.Transactions.Add(transaction); // adiciona no contexto
    await db.SaveChangesAsync(); // salva no banco
    return Results.Created($"/api/transactions/{transaction.Id}", transaction); // retorna 201 com o registro
});

// Rota: atualizar uma transação existente
app.MapPut("/api/transactions/{id:int}", async (int id, Transaction input, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin, UserRole.User) is IResult notAllowed) return notAllowed;

    var tx = await db.Transactions.FindAsync(id); // procura pelo ID
    if (tx is null) return Results.NotFound(); // se não achar, retorna 404

    // Atualiza os campos com os valores enviados
    tx.Date = input.Date;
    tx.Description = input.Description;
    tx.Amount = input.Amount;
    tx.Type = input.Type;
    tx.Category = input.Category;

    await db.SaveChangesAsync(); // salva as alterações
    return Results.NoContent(); // retorna 204 (sem conteúdo)
});

// Rota: excluir uma transação
app.MapDelete("/api/transactions/{id:int}", async (int id, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin, UserRole.User) is IResult notAllowed) return notAllowed;

    var tx = await db.Transactions.FindAsync(id);
    if (tx is null) return Results.NotFound();

    db.Transactions.Remove(tx); // remove do banco
    await db.SaveChangesAsync();
    return Results.NoContent();
});

// ---------- ROTAS DE CADASTRO (MENU CADASTRO) ----------

// Empresa (somente Master/Admin)
app.MapGet("/api/companies", async (AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult notAllowed) return notAllowed;
    return Results.Ok(await db.Companies.AsNoTracking().ToListAsync());
});

app.MapGet("/api/companies/{id:int}", async (int id, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult notAllowed) return notAllowed;
    return await db.Companies.FindAsync(id) is var company && company is not null ? Results.Ok(company) : Results.NotFound();
});

app.MapPost("/api/companies", async (Company company, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult notAllowed) return notAllowed;
    db.Companies.Add(company);
    await db.SaveChangesAsync();
    return Results.Created($"/api/companies/{company.Id}", company);
});

// Cliente / Fornecedor (somente Master/Admin)
app.MapGet("/api/customersuppliers", async (AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult notAllowed) return notAllowed;
    return Results.Ok(await db.CustomerSuppliers.AsNoTracking().ToListAsync());
});

app.MapGet("/api/customersuppliers/{id:int}", async (int id, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult notAllowed) return notAllowed;
    return await db.CustomerSuppliers.FindAsync(id) is var cs && cs is not null ? Results.Ok(cs) : Results.NotFound();
});

app.MapPost("/api/customersuppliers", async (CustomerSupplier cs, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult notAllowed) return notAllowed;
    db.CustomerSuppliers.Add(cs);
    await db.SaveChangesAsync();
    return Results.Created($"/api/customersuppliers/{cs.Id}", cs);
});

// Usuário (somente Master/Admin)
app.MapGet("/api/users", async (AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult notAllowed) return notAllowed;
    return Results.Ok(await db.Users.AsNoTracking().ToListAsync());
});

app.MapGet("/api/users/{id:int}", async (int id, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult notAllowed) return notAllowed;
    return await db.Users.FindAsync(id) is var user && user is not null ? Results.Ok(user) : Results.NotFound();
});

app.MapPost("/api/users", async (User user, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult notAllowed) return notAllowed;
    db.Users.Add(user);
    await db.SaveChangesAsync();
    return Results.Created($"/api/users/{user.Id}", user);
});

// Plano de contas (somente Master/Admin)
app.MapGet("/api/accountplans", async (AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult notAllowed) return notAllowed;
    return Results.Ok(await db.AccountPlans.AsNoTracking().ToListAsync());
});

app.MapGet("/api/accountplans/{id:int}", async (int id, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult notAllowed) return notAllowed;
    return await db.AccountPlans.FindAsync(id) is var plan && plan is not null ? Results.Ok(plan) : Results.NotFound();
});

app.MapPost("/api/accountplans", async (AccountPlan plan, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult notAllowed) return notAllowed;
    db.AccountPlans.Add(plan);
    await db.SaveChangesAsync();
    return Results.Created($"/api/accountplans/{plan.Id}", plan);
});

// Rota: resumo financeiro (total entradas, saídas e saldo)
app.MapGet("/api/summary", async (AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin, UserRole.User, UserRole.Viewer) is IResult notAllowed) return notAllowed;

    var totalIn = await db.Transactions
        .Where(t => t.Type == TransactionType.Income)
        .SumAsync(t => t.Amount); // soma as entradas

    var totalOut = await db.Transactions
        .Where(t => t.Type == TransactionType.Expense)
        .SumAsync(t => t.Amount); // soma as despesas

    var balance = totalIn - totalOut; // calcula saldo

    return Results.Ok(new { totalIn, totalOut, balance }); // retorna o resumo
});

app.Run(); // inicia o servidor web
