using GestOmei.Api.Data;
using GestOmei.Api.Models;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var defaultConn = builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (!string.IsNullOrEmpty(defaultConn) && defaultConn.Contains("server=", StringComparison.OrdinalIgnoreCase))
        options.UseMySql(defaultConn, ServerVersion.AutoDetect(defaultConn));
    else
        options.UseSqlite(defaultConn ?? "Data Source=gestomei.db");
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
    options.AddPolicy("LocalDev", p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (db.Database.IsSqlite())
    {
        // SQLite: recria automaticamente se schema desatualizado
        try
        {
            db.Database.EnsureCreated();
            _ = db.AccountPlans.FirstOrDefault();
            _ = db.Transactions.FirstOrDefault();
        }
        catch
        {
            db.Database.EnsureDeleted();
            db.Database.EnsureCreated();
        }
    }
    else
    {
        // MySQL: aplica migrations pendentes (cria tabelas / colunas novas)
        db.Database.Migrate();
    }

    if (!db.Users.Any(u => u.Role == UserRole.Master))
    {
        db.Users.Add(new User
        {
            Username = "master", Password = "master",
            FullName = "Usuário Master", Email = "master@localhost",
            Role = UserRole.Master
        });
        db.SaveChanges();
    }

    // Plano de contas modelo MEI
    // Sintética = agrupadora (não recebe lançamentos)
    // Analítica  = operacional (recebe lançamentos)
    var planSeed = new List<(string Code, string Name, string Type, string Nature)>
    {
        ("1.0",   "Receitas",                        "Receita", "Sintética"),
        ("1.1",   "Receitas de Serviços",             "Receita", "Analítica"),
        ("1.2",   "Receitas de Vendas",               "Receita", "Analítica"),
        ("1.3",   "Receitas Industriais",             "Receita", "Analítica"),
        ("1.4",   "Outras Receitas Operacionais",     "Receita", "Analítica"),
        ("1.5",   "Receitas Financeiras",             "Receita", "Analítica"),
        ("2.0",   "Despesas",                         "Despesa", "Sintética"),
        ("2.1",   "Despesas com Pessoal",             "Despesa", "Sintética"),
        ("2.1.1", "Salários e Ordenados",             "Despesa", "Analítica"),
        ("2.1.2", "Encargos Sociais",                 "Despesa", "Analítica"),
        ("2.2",   "Despesas com Fornecedores",        "Despesa", "Sintética"),
        ("2.2.1", "Compra de Mercadorias",            "Despesa", "Analítica"),
        ("2.2.2", "Matéria-Prima",                    "Despesa", "Analítica"),
        ("2.3",   "Despesas Administrativas",         "Despesa", "Sintética"),
        ("2.3.1", "Aluguel",                          "Despesa", "Analítica"),
        ("2.3.2", "Água e Energia Elétrica",          "Despesa", "Analítica"),
        ("2.3.3", "Telefone e Internet",              "Despesa", "Analítica"),
        ("2.3.4", "Material de Escritório",           "Despesa", "Analítica"),
        ("2.4",   "Tributos e Impostos",              "Despesa", "Sintética"),
        ("2.4.1", "DAS (Simples Nacional)",           "Despesa", "Analítica"),
        ("2.4.2", "IPTU e Taxas Municipais",          "Despesa", "Analítica"),
        ("2.5",   "Despesas Financeiras",             "Despesa", "Sintética"),
        ("2.5.1", "Juros e Encargos",                 "Despesa", "Analítica"),
        ("2.5.2", "Tarifas Bancárias",                "Despesa", "Analítica"),
        ("2.6",   "Marketing e Publicidade",          "Despesa", "Analítica"),
        ("2.7",   "Outras Despesas",                  "Despesa", "Analítica"),
    };

    var existingCodes = db.AccountPlans.Select(p => p.Code).ToHashSet();
    foreach (var (code, name, type, nature) in planSeed)
        if (!existingCodes.Contains(code))
            db.AccountPlans.Add(new AccountPlan { Code = code, Name = name, Type = type, Nature = nature });
    db.SaveChanges();

    // Lançamentos de teste — gerados apenas se a tabela estiver vazia
    if (!db.Transactions.Any())
    {
        var plans = db.AccountPlans.ToDictionary(p => p.Code);

        Transaction Tx(DateTime date, string desc, decimal amount, TransactionType type, string planCode) =>
            new Transaction
            {
                Date = date, Description = desc, Amount = amount, Type = type,
                Category     = plans.TryGetValue(planCode, out var p) ? p.Name : planCode,
                AccountPlanId   = plans.TryGetValue(planCode, out var p2) ? p2.Id   : null,
                AccountPlanCode = plans.TryGetValue(planCode, out var p3) ? p3.Code : planCode,
                AccountPlanName = plans.TryGetValue(planCode, out var p4) ? p4.Name : planCode,
            };

        db.Transactions.AddRange(
            // ── Janeiro 2026 ──
            Tx(new DateTime(2026,1,5),  "Consultoria em TI — Cliente A",        3500.00m, TransactionType.Income,  "1.1"),
            Tx(new DateTime(2026,1,10), "Venda de equipamento",                  1200.00m, TransactionType.Income,  "1.2"),
            Tx(new DateTime(2026,1,10), "Aluguel sala comercial",                 800.00m, TransactionType.Expense, "2.3.1"),
            Tx(new DateTime(2026,1,15), "DAS Simples Nacional — Jan",              66.00m, TransactionType.Expense, "2.4.1"),
            Tx(new DateTime(2026,1,20), "Telefone e Internet",                    120.00m, TransactionType.Expense, "2.3.3"),
            Tx(new DateTime(2026,1,22), "Material de escritório",                  85.00m, TransactionType.Expense, "2.3.4"),

            // ── Fevereiro 2026 ──
            Tx(new DateTime(2026,2,3),  "Manutenção de sistemas — Cliente B",    2800.00m, TransactionType.Income,  "1.1"),
            Tx(new DateTime(2026,2,7),  "Rendimento conta corrente",               45.00m, TransactionType.Income,  "1.5"),
            Tx(new DateTime(2026,2,10), "Aluguel sala comercial",                 800.00m, TransactionType.Expense, "2.3.1"),
            Tx(new DateTime(2026,2,15), "DAS Simples Nacional — Fev",              66.00m, TransactionType.Expense, "2.4.1"),
            Tx(new DateTime(2026,2,18), "Água e energia elétrica",                180.00m, TransactionType.Expense, "2.3.2"),
            Tx(new DateTime(2026,2,20), "Telefone e Internet",                    120.00m, TransactionType.Expense, "2.3.3"),

            // ── Março 2026 ──
            Tx(new DateTime(2026,3,4),  "Consultoria em TI — Cliente C",         4000.00m, TransactionType.Income,  "1.1"),
            Tx(new DateTime(2026,3,8),  "Venda de produtos",                      950.00m, TransactionType.Income,  "1.2"),
            Tx(new DateTime(2026,3,10), "Aluguel sala comercial",                 800.00m, TransactionType.Expense, "2.3.1"),
            Tx(new DateTime(2026,3,15), "DAS Simples Nacional — Mar",              66.00m, TransactionType.Expense, "2.4.1"),
            Tx(new DateTime(2026,3,18), "Compra de mercadorias para revenda",     420.00m, TransactionType.Expense, "2.2.1"),
            Tx(new DateTime(2026,3,25), "Tarifas bancárias",                       35.00m, TransactionType.Expense, "2.5.2"),

            // ── Abril 2026 ──
            Tx(new DateTime(2026,4,2),  "Desenvolvimento de website — Cliente D", 3200.00m, TransactionType.Income,  "1.1"),
            Tx(new DateTime(2026,4,10), "Aluguel sala comercial",                  800.00m, TransactionType.Expense, "2.3.1"),
            Tx(new DateTime(2026,4,15), "DAS Simples Nacional — Abr",               66.00m, TransactionType.Expense, "2.4.1"),
            Tx(new DateTime(2026,4,20), "Publicidade — redes sociais",             250.00m, TransactionType.Expense, "2.6"),
            Tx(new DateTime(2026,4,22), "Telefone e Internet",                     120.00m, TransactionType.Expense, "2.3.3"),
            Tx(new DateTime(2026,4,28), "Encargos sobre folha",                    210.00m, TransactionType.Expense, "2.1.2"),

            // ── Maio 2026 ──
            Tx(new DateTime(2026,5,5),  "Consultoria em TI — Cliente A",          3800.00m, TransactionType.Income,  "1.1"),
            Tx(new DateTime(2026,5,6),  "Venda de serviços recorrentes",           600.00m, TransactionType.Income,  "1.1"),
            Tx(new DateTime(2026,5,10), "Aluguel sala comercial",                  800.00m, TransactionType.Expense, "2.3.1"),
            Tx(new DateTime(2026,5,15), "DAS Simples Nacional — Mai",               66.00m, TransactionType.Expense, "2.4.1"),
            Tx(new DateTime(2026,5,16), "Material de escritório",                   55.00m, TransactionType.Expense, "2.3.4"),
            Tx(new DateTime(2026,5,16), "Água e energia elétrica",                 175.00m, TransactionType.Expense, "2.3.2")
        );
        db.SaveChanges();
    }
}

app.UseCors("LocalDev");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

static UserRole? GetUserRole(HttpRequest request)
{
    if (!request.Headers.TryGetValue("X-User-Role", out var values)) return null;
    return Enum.TryParse<UserRole>(values.ToString(), true, out var role) ? role : null;
}

static IResult? RequireRole(HttpRequest request, params UserRole[] allowed)
{
    var role = GetUserRole(request);
    if (role is null) return Results.Unauthorized();
    return allowed.Contains(role.Value) ? null : Results.Forbid();
}

// ── EMPRESA ──────────────────────────────────────────────────────────────────

app.MapGet("/api/companies", async (AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult e) return e;
    return Results.Ok(await db.Companies.AsNoTracking().ToListAsync());
});

app.MapGet("/api/companies/{id:int}", async (int id, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult e) return e;
    var c = await db.Companies.FindAsync(id);
    return c is not null ? Results.Ok(c) : Results.NotFound();
});

app.MapPost("/api/companies", async (Company company, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult e) return e;
    db.Companies.Add(company);
    await db.SaveChangesAsync();
    return Results.Created($"/api/companies/{company.Id}", company);
});

app.MapPut("/api/companies/{id:int}", async (int id, Company input, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult e) return e;
    var c = await db.Companies.FindAsync(id);
    if (c is null) return Results.NotFound();
    c.Name = input.Name; c.Cnpj = input.Cnpj; c.Address = input.Address;
    c.Phone = input.Phone; c.Email = input.Email;
    c.InscricaoEstadual = input.InscricaoEstadual; c.InscricaoMunicipal = input.InscricaoMunicipal;
    c.Responsavel = input.Responsavel; c.DataAbertura = input.DataAbertura;
    c.AtividadePrimaria = input.AtividadePrimaria; c.AtividadesSecundarias = input.AtividadesSecundarias;
    c.TipoAtividade = input.TipoAtividade; c.LogoBase64 = input.LogoBase64;
    await db.SaveChangesAsync();
    return Results.Ok(c);
});

app.MapDelete("/api/companies/{id:int}", async (int id, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master) is IResult e) return e;
    var c = await db.Companies.FindAsync(id);
    if (c is null) return Results.NotFound();
    db.Companies.Remove(c);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.MapPost("/api/companies/{id:int}/inactivate", async (int id, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master) is IResult e) return e;
    var c = await db.Companies.FindAsync(id);
    if (c is null) return Results.NotFound();
    c.IsActive = false; await db.SaveChangesAsync(); return Results.Ok(c);
});

app.MapPost("/api/companies/{id:int}/activate", async (int id, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master) is IResult e) return e;
    var c = await db.Companies.FindAsync(id);
    if (c is null) return Results.NotFound();
    c.IsActive = true; await db.SaveChangesAsync(); return Results.Ok(c);
});

// ── CLIENTE / FORNECEDOR ─────────────────────────────────────────────────────

app.MapGet("/api/customersuppliers", async (AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult e) return e;
    return Results.Ok(await db.CustomerSuppliers.AsNoTracking().ToListAsync());
});

app.MapGet("/api/customersuppliers/{id:int}", async (int id, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult e) return e;
    var cs = await db.CustomerSuppliers.FindAsync(id);
    return cs is not null ? Results.Ok(cs) : Results.NotFound();
});

app.MapPost("/api/customersuppliers", async (CustomerSupplier cs, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult e) return e;
    db.CustomerSuppliers.Add(cs);
    await db.SaveChangesAsync();
    return Results.Created($"/api/customersuppliers/{cs.Id}", cs);
});

app.MapPut("/api/customersuppliers/{id:int}", async (int id, CustomerSupplier input, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult e) return e;
    var cs = await db.CustomerSuppliers.FindAsync(id);
    if (cs is null) return Results.NotFound();
    cs.Name = input.Name; cs.Document = input.Document;
    cs.Email = input.Email; cs.Phone = input.Phone; cs.IsSupplier = input.IsSupplier;
    await db.SaveChangesAsync();
    return Results.Ok(cs);
});

app.MapDelete("/api/customersuppliers/{id:int}", async (int id, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult e) return e;
    var cs = await db.CustomerSuppliers.FindAsync(id);
    if (cs is null) return Results.NotFound();
    db.CustomerSuppliers.Remove(cs);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

// ── USUÁRIO ──────────────────────────────────────────────────────────────────

app.MapGet("/api/users", async (AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult e) return e;
    return Results.Ok(await db.Users.AsNoTracking().ToListAsync());
});

app.MapGet("/api/users/{id:int}", async (int id, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult e) return e;
    var u = await db.Users.FindAsync(id);
    return u is not null ? Results.Ok(u) : Results.NotFound();
});

app.MapPost("/api/users", async (User user, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult e) return e;
    db.Users.Add(user);
    await db.SaveChangesAsync();
    return Results.Created($"/api/users/{user.Id}", user);
});

app.MapPut("/api/users/{id:int}", async (int id, User input, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult e) return e;
    var u = await db.Users.FindAsync(id);
    if (u is null) return Results.NotFound();
    u.Username = input.Username;
    if (!string.IsNullOrWhiteSpace(input.Password)) u.Password = input.Password;
    u.FullName = input.FullName; u.Email = input.Email; u.Role = input.Role;
    await db.SaveChangesAsync();
    return Results.Ok(u);
});

app.MapDelete("/api/users/{id:int}", async (int id, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master) is IResult e) return e;
    var u = await db.Users.FindAsync(id);
    if (u is null) return Results.NotFound();
    db.Users.Remove(u);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

// ── PLANO DE CONTAS ──────────────────────────────────────────────────────────

app.MapGet("/api/accountplans", async (AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin, UserRole.User, UserRole.Viewer) is IResult e) return e;
    return Results.Ok(await db.AccountPlans.AsNoTracking().OrderBy(p => p.Code).ToListAsync());
});

app.MapGet("/api/accountplans/{id:int}", async (int id, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin, UserRole.User, UserRole.Viewer) is IResult e) return e;
    var p = await db.AccountPlans.FindAsync(id);
    return p is not null ? Results.Ok(p) : Results.NotFound();
});

app.MapPost("/api/accountplans", async (AccountPlan plan, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master) is IResult e) return e;
    db.AccountPlans.Add(plan);
    await db.SaveChangesAsync();
    return Results.Created($"/api/accountplans/{plan.Id}", plan);
});

app.MapPut("/api/accountplans/{id:int}", async (int id, AccountPlan input, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master) is IResult e) return e;
    var p = await db.AccountPlans.FindAsync(id);
    if (p is null) return Results.NotFound();
    p.Code = input.Code; p.Name = input.Name; p.Type = input.Type; p.Nature = input.Nature;
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.MapDelete("/api/accountplans/{id:int}", async (int id, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master) is IResult e) return e;
    var p = await db.AccountPlans.FindAsync(id);
    if (p is null) return Results.NotFound();
    db.AccountPlans.Remove(p);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

// ── MOVIMENTO (TRANSAÇÕES) ───────────────────────────────────────────────────

app.MapGet("/api/transactions", async (AppDbContext db, HttpRequest req, string? from, string? to, int? companyId) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin, UserRole.User, UserRole.Viewer) is IResult e) return e;
    var query = db.Transactions.AsNoTracking().AsQueryable();
    if (from != null) { var d = DateTime.Parse(from); query = query.Where(t => t.Date >= d); }
    if (to   != null) { var d = DateTime.Parse(to).AddDays(1).AddTicks(-1); query = query.Where(t => t.Date <= d); }
    if (companyId.HasValue) query = query.Where(t => t.CompanyId == companyId);
    return Results.Ok(await query.OrderByDescending(t => t.Date).ToListAsync());
});

app.MapGet("/api/transactions/{id:int}", async (int id, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin, UserRole.User, UserRole.Viewer) is IResult e) return e;
    var t = await db.Transactions.FindAsync(id);
    return t is not null ? Results.Ok(t) : Results.NotFound();
});

app.MapPost("/api/transactions", async (Transaction tx, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult e) return e;
    db.Transactions.Add(tx);
    await db.SaveChangesAsync();
    return Results.Created($"/api/transactions/{tx.Id}", tx);
});

app.MapPut("/api/transactions/{id:int}", async (int id, Transaction input, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult e) return e;
    var tx = await db.Transactions.FindAsync(id);
    if (tx is null) return Results.NotFound();
    tx.Date = input.Date; tx.Description = input.Description; tx.Amount = input.Amount;
    tx.Type = input.Type; tx.Category = input.Category;
    tx.AccountPlanId = input.AccountPlanId; tx.AccountPlanCode = input.AccountPlanCode;
    tx.AccountPlanName = input.AccountPlanName; tx.CompanyId = input.CompanyId;
    await db.SaveChangesAsync();
    return Results.Ok(tx);
});

app.MapDelete("/api/transactions/{id:int}", async (int id, AppDbContext db, HttpRequest req) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin) is IResult e) return e;
    var tx = await db.Transactions.FindAsync(id);
    if (tx is null) return Results.NotFound();
    db.Transactions.Remove(tx);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

// ── RELATÓRIOS ───────────────────────────────────────────────────────────────

app.MapGet("/api/reports/dre", async (AppDbContext db, HttpRequest req, string? from, string? to, int? companyId) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin, UserRole.User, UserRole.Viewer) is IResult e) return e;

    var fromDate = from != null ? DateTime.Parse(from) : new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1);
    var toDate   = to   != null ? DateTime.Parse(to).AddDays(1).AddTicks(-1) : DateTime.Now;

    var query = db.Transactions.AsNoTracking().Where(t => t.Date >= fromDate && t.Date <= toDate);
    if (companyId.HasValue) query = query.Where(t => t.CompanyId == companyId);
    var txs = await query.ToListAsync();

    var receitas = txs.Where(t => t.Type == TransactionType.Income)
        .GroupBy(t => new { t.AccountPlanCode, t.AccountPlanName })
        .Select(g => new { code = g.Key.AccountPlanCode, name = g.Key.AccountPlanName, total = g.Sum(t => t.Amount) })
        .OrderBy(x => x.code).ToList();

    var despesas = txs.Where(t => t.Type == TransactionType.Expense)
        .GroupBy(t => new { t.AccountPlanCode, t.AccountPlanName })
        .Select(g => new { code = g.Key.AccountPlanCode, name = g.Key.AccountPlanName, total = g.Sum(t => t.Amount) })
        .OrderBy(x => x.code).ToList();

    var totalR = receitas.Sum(r => r.total);
    var totalD = despesas.Sum(d => d.total);

    return Results.Ok(new
    {
        period = new { from = fromDate.ToString("yyyy-MM-dd"), to = toDate.ToString("yyyy-MM-dd") },
        receitas,
        totalReceitas = totalR,
        despesas,
        totalDespesas = totalD,
        resultado = totalR - totalD
    });
});

app.MapGet("/api/reports/extrato", async (AppDbContext db, HttpRequest req, string? from, string? to, int? companyId) =>
{
    if (RequireRole(req, UserRole.Master, UserRole.Admin, UserRole.User, UserRole.Viewer) is IResult e) return e;

    var fromDate = from != null ? DateTime.Parse(from) : new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1);
    var toDate   = to   != null ? DateTime.Parse(to).AddDays(1).AddTicks(-1) : DateTime.Now;

    var query = db.Transactions.AsNoTracking().Where(t => t.Date >= fromDate && t.Date <= toDate);
    if (companyId.HasValue) query = query.Where(t => t.CompanyId == companyId);
    var txs = await query.OrderBy(t => t.Date).ToListAsync();

    var totalR = txs.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount);
    var totalD = txs.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount);

    return Results.Ok(new
    {
        period = new { from = fromDate.ToString("yyyy-MM-dd"), to = toDate.ToString("yyyy-MM-dd") },
        transactions = txs,
        totalReceitas = totalR,
        totalDespesas = totalD,
        saldo = totalR - totalD
    });
});

app.MapGet("/api/me", (HttpRequest req) =>
{
    var role = GetUserRole(req);
    if (role is null) return Results.Unauthorized();
    return Results.Ok(new
    {
        role = role.ToString(),
        canManageCompanies    = role == UserRole.Master || role == UserRole.Admin,
        canManageCustomers    = role == UserRole.Master || role == UserRole.Admin,
        canManageUsers        = role == UserRole.Master || role == UserRole.Admin,
        canManageAccountPlans = role == UserRole.Master,
        canView = true
    });
});

app.Run();
