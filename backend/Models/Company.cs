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

    // Novos campos solicitados
    public string InscricaoEstadual { get; set; } = string.Empty;
    public string InscricaoMunicipal { get; set; } = string.Empty;
    public string Responsavel { get; set; } = string.Empty;
    public DateTime DataAbertura { get; set; } = DateTime.UtcNow;
    public string AtividadePrimaria { get; set; } = string.Empty;
    public string AtividadesSecundarias { get; set; } = string.Empty; // Pode ser lista separada por vírgulas
    public string TipoAtividade { get; set; } = string.Empty; // "Servico,Comercio,Industria"
    public string LogoBase64 { get; set; } = string.Empty; // Armazena logo em Base64 (PNG/JPG)
}
