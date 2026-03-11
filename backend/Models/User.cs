namespace GestOmei.Api.Models;

// Perfis/níveis de acesso do sistema.
public enum UserRole
{
    Master, // Acesso total (dono do sistema)
    Admin,  // Pode cadastrar e gerenciar dados do sistema
    User,   // Pode lançar transações e gerar relatórios
    Viewer  // Apenas consulta (visualiza, não altera)
}

// Usuário que pode acessar o sistema (login).
public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty; // login
    public string Password { get; set; } = string.Empty; // (em produção, deve ser hash)
    public string FullName { get; set; } = string.Empty; // nome completo
    public string Email { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.User; // Nível de acesso
}
