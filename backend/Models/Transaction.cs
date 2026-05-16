namespace GestOmei.Api.Models;

public enum TransactionType { Income, Expense }

public class Transaction
{
    public int Id { get; set; }
    public DateTime Date { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public TransactionType Type { get; set; }
    public string Category { get; set; } = string.Empty;
    public int? AccountPlanId { get; set; }
    public string AccountPlanCode { get; set; } = string.Empty;
    public string AccountPlanName { get; set; } = string.Empty;
    public int? CompanyId { get; set; }
}
