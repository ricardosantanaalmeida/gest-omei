namespace GestOmei.Api.Models;

// Tipo da transação: entrada ou saída
public enum TransactionType
{
    Income, // Entrada de dinheiro
    Expense // Saída de dinheiro
}

// Modelo que representa uma linha na tabela de transações.
public class Transaction
{
    public int Id { get; set; } // Chave primária (identificador único)
    public DateTime Date { get; set; } // Data da transação
    public string Description { get; set; } = string.Empty; // Descrição breve
    public decimal Amount { get; set; } // Valor da transação
    public TransactionType Type { get; set; } // Se é entrada ou saída
    public string Category { get; set; } = string.Empty; // Categoria (ex: "Alimentação", "Venda")
}
