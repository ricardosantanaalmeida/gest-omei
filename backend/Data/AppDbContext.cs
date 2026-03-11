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

    // Tabelas para o menu CADASTRO
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<CustomerSupplier> CustomerSuppliers => Set<CustomerSupplier>();
    public DbSet<User> Users => Set<User>();
    public DbSet<AccountPlan> AccountPlans => Set<AccountPlan>();
}
