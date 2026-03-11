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

// Rota: obter todas as transações
app.MapGet("/api/transactions", async (AppDbContext db) =>
    await db.Transactions.AsNoTracking().ToListAsync());

// Rota: obter uma transação por ID
app.MapGet("/api/transactions/{id:int}", async (int id, AppDbContext db) =>
    await db.Transactions.FindAsync(id) is Transaction tx ? Results.Ok(tx) : Results.NotFound());

// Rota: criar uma nova transação
app.MapPost("/api/transactions", async (Transaction transaction, AppDbContext db) =>
{
    // Se a data não for enviada, usa a data/hora atual
    transaction.Date = transaction.Date == default ? DateTime.UtcNow : transaction.Date;
    db.Transactions.Add(transaction); // adiciona no contexto
    await db.SaveChangesAsync(); // salva no banco
    return Results.Created($"/api/transactions/{transaction.Id}", transaction); // retorna 201 com o registro
});

// Rota: atualizar uma transação existente
app.MapPut("/api/transactions/{id:int}", async (int id, Transaction input, AppDbContext db) =>
{
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
app.MapDelete("/api/transactions/{id:int}", async (int id, AppDbContext db) =>
{
    var tx = await db.Transactions.FindAsync(id);
    if (tx is null) return Results.NotFound();

    db.Transactions.Remove(tx); // remove do banco
    await db.SaveChangesAsync();
    return Results.NoContent();
});

// Rota: resumo financeiro (total entradas, saídas e saldo)
app.MapGet("/api/summary", async (AppDbContext db) =>
{
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
