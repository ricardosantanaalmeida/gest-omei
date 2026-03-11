namespace GestOmei.Api.Models;

// Representa a empresa que usa o sistema (dados da própria MEI).
public class Company
{
    public int Id { get; set; } // Identificador único
    public string Name { get; set; } = string.Empty; // Nome da empresa
    public string Cnpj { get; set; } = string.Empty; // CNPJ da empresa (ou CPF)
    public string Address { get; set; } = string.Empty; // Endereço
    public string Phone { get; set; } = string.Empty; // Telefone de contato
    public string Email { get; set; } = string.Empty; // E-mail de contato
}
