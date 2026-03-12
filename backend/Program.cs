using System.Text;
using EduConnect.Api.Data;
using EduConnect.Api.Models;
using EduConnect.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

var builder = WebApplication.CreateBuilder(args);

// ===============================================
// 1) CONFIGURAÇÃO DO BANCO DE DADOS
// ===============================================
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException("A connection string 'DefaultConnection' não foi configurada.");

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseSqlServer(connectionString);
});

// ===============================================
// 2) SERVIÇOS DA APLICAÇÃO
// ===============================================
builder.Services.AddScoped<JwtService>();
builder.Services.AddScoped<EmailService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(opt =>
{
    opt.SwaggerDoc("v1", new() { Title = "EduConnect API", Version = "v1" });

    opt.AddSecurityDefinition("Bearer", new()
    {
        Description = "Insira: Bearer {seu_token}",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer"
    });

    opt.AddSecurityRequirement(new()
    {
        {
            new() { Reference = new() { Id = "Bearer", Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme } },
            Array.Empty<string>()
        }
    });
});

// ===============================================
// 3) AUTENTICAÇÃO JWT
// ===============================================
var jwtKey = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

if (string.IsNullOrWhiteSpace(jwtKey))
    throw new InvalidOperationException("A configuração Jwt:Key não foi informada.");

if (string.IsNullOrWhiteSpace(jwtIssuer))
    throw new InvalidOperationException("A configuração Jwt:Issuer não foi informada.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.TokenValidationParameters = new()
        {
            ValidateIssuer = true,
            ValidateAudience = !string.IsNullOrWhiteSpace(jwtAudience),
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,

            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

// ===============================================
// 4) CORS
// ===============================================
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy
                .WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod();
        }
        else
        {
            policy
                .WithOrigins("http://localhost:5173")
                .AllowAnyHeader()
                .AllowAnyMethod();
        }
    });
});

var app = builder.Build();

// ===============================================
// 5) SWAGGER NO DESENVOLVIMENTO
// ===============================================
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// ===============================================
// 6) MIDDLEWARES
// ===============================================
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// ===============================================
// 7) MIGRATIONS AUTOMÁTICAS
// ===============================================
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>()
        .CreateLogger("Startup");

    try
    {
        db.Database.Migrate();
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Erro ao aplicar migrations automaticamente.");
        throw;
    }

    // ===============================================
    // 8) SEED DE ADMIN VIA CONFIGURAÇÃO SEGURA
    // ===============================================
    var adminUsername = builder.Configuration["SeedAdmin:Username"];
    var adminPassword = builder.Configuration["SeedAdmin:Password"];

    if (!string.IsNullOrWhiteSpace(adminUsername) &&
        !string.IsNullOrWhiteSpace(adminPassword))
    {
        var adminExiste = db.Usuarios.Any(u =>
            u.Role == UserRoles.Administrador &&
            u.Username == adminUsername);

        if (!adminExiste)
        {
            var admin = new Usuario
            {
                Username = adminUsername,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword),
                Role = UserRoles.Administrador,
                PrimeiroAcesso = false
            };

            db.Usuarios.Add(admin);
            db.SaveChanges();

            logger.LogInformation("Usuário administrador inicial criado com sucesso.");
        }
    }
    else
    {
        logger.LogWarning("Seed de admin não executado porque SeedAdmin:Username e/ou SeedAdmin:Password não foram configurados.");
    }
}

app.Run();