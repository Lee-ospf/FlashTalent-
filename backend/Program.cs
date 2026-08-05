using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using TalentHub.Data;
using TalentHub.Models;
using TalentHub.Services;
using Microsoft.OpenApi.Models;



var builder = WebApplication.CreateBuilder(args);

// ---------- Services ----------
//convert enum to string in json
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

// EF Core + SQL Server (LocalDB)
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// JWT Authentication
var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSection["Key"] ?? throw new InvalidOperationException("Jwt:Key is missing in appsettings.json");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSection["Issuer"],
        ValidAudience = jwtSection["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

builder.Services.AddAuthorization();
builder.Services.AddScoped<IPrescreeningService, PrescreeningService>();

// CORS - frontend (Person C/D) runs on a different origin/port, so the browser
// needs explicit permission to call this API. Tighten this list to your actual
// frontend URL(s) once known; "*" during dev is fine but not for submission.
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:3000",   // common React dev port
                "http://localhost:5173",   // common Vite dev port
                "http://localhost:4200"    // common Angular dev port
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer",
        new OpenApiSecurityScheme
        {
            Name = "Authorization",
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header,
            Description = "Enter JWT Token"
        });

    options.AddSecurityRequirement(
        new OpenApiSecurityRequirement        {
            {
                new OpenApiSecurityScheme                {
                    Reference = new OpenApiReference                    {
                        Type = ReferenceType.SecurityScheme,
                        Id = "Bearer"                    }
                },
                Array.Empty<string>()
            }
        });
});

builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IDocumentValidationService, DocumentValidationService>();
builder.Services.AddScoped<IApplicationStatusRules, ApplicationStatusRules>();
builder.Services.AddHttpClient();
builder.Services.AddHostedService<VacancyClosingDateService>();

builder.Services.AddScoped<IDocumentValidationService, DocumentValidationService>();
builder.Services.AddScoped<IApplicationStatusRules, ApplicationStatusRules>();
builder.Services.AddScoped<ITalentPoolService, TalentPoolService>();
builder.Services.AddScoped<IInterviewService, InterviewService>();
builder.Services.AddScoped<IOfferLetterService, OfferLetterService>();
var app = builder.Build();


// ---------- Middleware pipeline ----------

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

// Serve uploaded documents back as static files (e.g. so a recruiter can open a CV link)
app.UseStaticFiles();

app.MapControllers();


app.Run();