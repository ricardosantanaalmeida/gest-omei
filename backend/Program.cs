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

// Habilita CORS para permitir que o front-end (HTML/JS) acesse a API.
// Em um projeto real, ajuste para apenas domínios autorizados.
builder.Services.AddCors(options =>
{
    options.AddPolicy("LocalDev", policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build(); // Constrói a aplicação com os serviços configurados

// Cria o arquivo do banco de dados SQLite automaticamente na primeira execução.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated(); // Cria o banco se não existir

    // Se não existir usuário Master, cria um padrão para gerenciar o sistema.
    if (!db.Users.Any(u => u.Role == UserRole.Master))
    {
        db.Users.Add(new User
        {
            Username = "master",
            Password = "master", // Em produção, use hash + senha forte
            FullName = "Usuário Master",
            Email = "master@localhost",
            Role = UserRole.Master
        });
        db.SaveChanges();
    }

    // Se não existir plano de contas, cria uma estrutura básica
    if (!db.AccountPlans.Any())
    {
        db.AccountPlans.AddRange(
            new AccountPlan { Code = "1.0", Name = "Receitas", Type = "Receita" },
            new AccountPlan { Code = "2.0", Name = "Despesas", Type = "Despesa" }
        );
        db.SaveChanges();
    }
}

// Permite que o front-end acesse a API via CORS.
app.UseCors("LocalDev");

// No modo desenvolvimento, habilita o Swagger (página de testes da API)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Em ambiente de desenvolvimento / teste, removemos a restrição de perfil
// para simplificar o uso; todas as rotas ficam acessíveis sem verificar X-User-Role.
static IResult? RequireRole(HttpRequest request, params UserRole[] allowedRoles)
{
    return null;
}

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

// Marca a empresa como inativa (somente Master)
app.MapPost("/api/companies/{id:int}/inactivate", async (int id, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master) is IResult notAllowed) return notAllowed;

    var company = await db.Companies.FindAsync(id);
    if (company is null) return Results.NotFound();

    company.IsActive = false;
    await db.SaveChangesAsync();
    return Results.Ok(company);
});

// Marca a empresa como ativa novamente (somente Master)
app.MapPost("/api/companies/{id:int}/activate", async (int id, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master) is IResult notAllowed) return notAllowed;

    var company = await db.Companies.FindAsync(id);
    if (company is null) return Results.NotFound();

    company.IsActive = true;
    await db.SaveChangesAsync();
    return Results.Ok(company);
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

// Plano de contas (qualquer perfil pode consultar, apenas Master pode alterar)
app.MapGet("/api/accountplans", async (AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin, UserRole.User, UserRole.Viewer) is IResult notAllowed) return notAllowed;
    return Results.Ok(await db.AccountPlans.AsNoTracking().ToListAsync());
});

app.MapGet("/api/accountplans/{id:int}", async (int id, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin, UserRole.User, UserRole.Viewer) is IResult notAllowed) return notAllowed;
    return await db.AccountPlans.FindAsync(id) is var plan && plan is not null ? Results.Ok(plan) : Results.NotFound();
});

app.MapPost("/api/accountplans", async (AccountPlan plan, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master) is IResult notAllowed) return notAllowed;
    db.AccountPlans.Add(plan);
    await db.SaveChangesAsync();
    return Results.Created($"/api/accountplans/{plan.Id}", plan);
});

app.MapPut("/api/accountplans/{id:int}", async (int id, AccountPlan input, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master) is IResult notAllowed) return notAllowed;

    var plan = await db.AccountPlans.FindAsync(id);
    if (plan is null) return Results.NotFound();

    plan.Code = input.Code;
    plan.Name = input.Name;
    plan.Type = input.Type;

    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.MapDelete("/api/accountplans/{id:int}", async (int id, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master) is IResult notAllowed) return notAllowed;

    var plan = await db.AccountPlans.FindAsync(id);
    if (plan is null) return Results.NotFound();

    db.AccountPlans.Remove(plan);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.Run(); // inicia o servidor web
