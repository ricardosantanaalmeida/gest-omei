using GestOmei.Api.Models; // Define os modelos usados no banco
using Microsoft.EntityFrameworkCore; // Biblioteca principal do Entity Framework

namespace GestOmei.Api.Data;

// O DbContext representa uma sessão com o banco de dados.
// Aqui você define as tabelas que serão criadas (DbSet<...>).
public class AppDbContext : DbContext
{
    // O construtor recebe opções (como qual banco e string de conexão) e passa para a classe pai.
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    // Define uma tabela (ou entidade) chamada Transactions no banco.
    // Cada Transaction aqui vira uma linha na tabela.
    public DbSet<Transaction> Transactions => Set<Transaction>();
}
