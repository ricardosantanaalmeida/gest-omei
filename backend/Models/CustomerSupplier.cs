namespace GestOmei.Api.Models;

// Cliente ou fornecedor (pessoa ou empresa que faz negócios com a MEI).
public class CustomerSupplier
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty; // Nome do cliente/fornecedor
    public string Document { get; set; } = string.Empty; // CPF ou CNPJ
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public bool IsSupplier { get; set; } // true = fornecedor, false = cliente
}
