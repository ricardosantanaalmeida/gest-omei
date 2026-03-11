namespace GestOmei.Api.Models;

// Plano de contas (categoria contábil) para organizar receitas/despesas.
public class AccountPlan
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty; // Código (ex: "1.1", "2.3")
    public string Name { get; set; } = string.Empty; // Nome da conta (ex: "Venda", "Combustível")
    public string Type { get; set; } = string.Empty; // Tipo (ex: "Receita", "Despesa")
}
