namespace GestOmei.Api.Models;

public class AccountPlan
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;    // Receita | Despesa
    public string Nature { get; set; } = "Analítica";   // Sintética | Analítica
}
