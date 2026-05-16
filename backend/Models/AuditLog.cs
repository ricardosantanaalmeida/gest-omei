namespace GestOmei.Api.Models;

public class AuditLog
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Activity { get; set; } = string.Empty;
    public string Entity { get; set; } = string.Empty;
    public string EntityName { get; set; } = string.Empty;
    public string Company { get; set; } = string.Empty;
    public DateTime DateTime { get; set; } = DateTime.Now;
}
