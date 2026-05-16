using GestOmei.Api.Data; // Usa o contexto do banco (AppDbContext)
using GestOmei.Api.Models; // Usa o modelo Transaction e TransactionType
using Microsoft.EntityFrameworkCore; // Para configurar o EF Core e o SQLite

var builder = WebApplication.CreateBuilder(args); // Cria o construtor da aplicação (configuração + serviços)

// Registra o contexto do banco (AppDbContext).
// Por padrão usa MySQL (configurado em appsettings.json), mas cai em SQLite caso não exista conexão.
var defaultConn = builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (!string.IsNullOrEmpty(defaultConn) && defaultConn.Contains("server=", StringComparison.OrdinalIgnoreCase))
    {
        // MySQL
        options.UseMySql(defaultConn, ServerVersion.AutoDetect(defaultConn));
    }
    else
    {
        // SQLite como fallback (local)
        options.UseSqlite(defaultConn ?? "Data Source=gestomei.db");
    }
});

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

// ---------- ROTAS DE CADASTRO (MENU CADASTRO) ----------

// Retorna informações sobre o perfil atual (X-User-Role) e permissões.
app.MapGet("/api/me", (HttpRequest req) =>
{
    var role = GetUserRole(req);
    if (role is null) return Results.Unauthorized();

    return Results.Ok(new
    {
        role = role.ToString(),
        canManageCompanies = role == UserRole.Master || role == UserRole.Admin,
        canManageCustomers = role == UserRole.Master || role == UserRole.Admin,
        canManageUsers = role == UserRole.Master || role == UserRole.Admin,
        canManageAccountPlans = role == UserRole.Master,
        canView = true
    });
});

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

app.MapPut("/api/companies/{id:int}", async (int id, Company input, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult notAllowed) return notAllowed;

    var company = await db.Companies.FindAsync(id);
    if (company is null) return Results.NotFound();

    company.Name = input.Name;
    company.Cnpj = input.Cnpj;
    company.Address = input.Address;
    company.Phone = input.Phone;
    company.Email = input.Email;
    company.InscricaoEstadual = input.InscricaoEstadual;
    company.InscricaoMunicipal = input.InscricaoMunicipal;
    company.Responsavel = input.Responsavel;
    company.DataAbertura = input.DataAbertura;
    company.AtividadePrimaria = input.AtividadePrimaria;
    company.AtividadesSecundarias = input.AtividadesSecundarias;
    company.TipoAtividade = input.TipoAtividade;
    company.LogoBase64 = input.LogoBase64;

    await db.SaveChangesAsync();
    return Results.Ok(company);
});

app.MapDelete("/api/companies/{id:int}", async (int id, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master) is IResult notAllowed) return notAllowed;

    var company = await db.Companies.FindAsync(id);
    if (company is null) return Results.NotFound();

    db.Companies.Remove(company);
    await db.SaveChangesAsync();
    return Results.NoContent();
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

app.MapPut("/api/customersuppliers/{id:int}", async (int id, CustomerSupplier input, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult notAllowed) return notAllowed;

    var cs = await db.CustomerSuppliers.FindAsync(id);
    if (cs is null) return Results.NotFound();

    cs.Name = input.Name;
    cs.Document = input.Document;
    cs.Email = input.Email;
    cs.Phone = input.Phone;
    cs.IsSupplier = input.IsSupplier;

    await db.SaveChangesAsync();
    return Results.Ok(cs);
});

app.MapDelete("/api/customersuppliers/{id:int}", async (int id, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult notAllowed) return notAllowed;

    var cs = await db.CustomerSuppliers.FindAsync(id);
    if (cs is null) return Results.NotFound();

    db.CustomerSuppliers.Remove(cs);
    await db.SaveChangesAsync();
    return Results.NoContent();
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

app.MapPut("/api/users/{id:int}", async (int id, User input, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult notAllowed) return notAllowed;

    var user = await db.Users.FindAsync(id);
    if (user is null) return Results.NotFound();

    user.Username = input.Username;
    if (!string.IsNullOrWhiteSpace(input.Password))
        user.Password = input.Password;
    user.FullName = input.FullName;
    user.Email = input.Email;
    user.Role = input.Role;

    await db.SaveChangesAsync();
    return Results.Ok(user);
});

app.MapDelete("/api/users/{id:int}", async (int id, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master) is IResult notAllowed) return notAllowed;

    var user = await db.Users.FindAsync(id);
    if (user is null) return Results.NotFound();

    db.Users.Remove(user);
    await db.SaveChangesAsync();
    return Results.NoContent();
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
