// I-import ang basic kategorya ng ASP.NET Core framework para sa modular routing services
using Microsoft.AspNetCore.Builder;
// Paggamit ng Dependency Injection upang pamahalaan ang software modules
using Microsoft.Extensions.DependencyInjection;
// Gagamitin para sa host configuration at development environment checks
using Microsoft.Extensions.Hosting;
// I-import ang ating data representations (Keypoint, Pose, SquatState, etc.)
using PoseDetectorApp.Models;
// I-import ang core physics math algorithms para sa biomechanical pose calculations
using PoseDetectorApp.Services;
// Serializer para sa pagpapalitan at pag-decode ng Javascript JSON parameters
using System.Text.Json;

// 1. Simulan ang Web Application Builder instance
var builder = WebApplication.CreateBuilder(args);

// 2. I-configure ang CORS (Cross-Origin Resource Sharing) Security Settings.
// Ipinatutupad ito upang payagan ang React UI (port 3000) na ligtas na makapagpadala ng pose coordinates patungo sa aming C# Engine.
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()      // Payagan ang kahit anong source website domain address
              .AllowAnyHeader()      // Payagan ang karaniwang authentication at content-type headers
              .AllowAnyMethod();     // Payagan ang POST, GET, OPTIONS, atbp.
    });
});

// 3. Buuin ang web Application engine base sa inihandang settings
var app = builder.Build();

// 4. Paganahin ang CORS security policy middlewares
app.UseCors();

// 5. Gumawa ng default GET endpoint sa root "/" para masubukan kung gumagana nang husto ang server
app.MapGet("/", () => Results.Ok(new { System = "C# Gesture & Posture Engine", Status = "Online", Version = "1.0.0" }));

// 6. Ang pangunahing POST API Endpoint: /api/pose/analyze.
// Dito pumapasok ang keypoint coordinates ng camera kada frame para sa biomechanical assessment.
app.MapPost("/api/pose/analyze", (AnalyzeRequest request) =>
{
    // Ligtas na salain kung walang laman o blanko ang ipinadalang coordinate packets
    if (request == null || string.IsNullOrEmpty(request.Exercise) || request.Pose == null)
    {
        return Results.BadRequest(new { Error = "Invalid analysis request parameters." });
    }

    try
    {
        // Gawing lowercase ang uri ng ehersisyo (e.g., "squat" o "pushup") para madaling itugma
        string exercise = request.Exercise.ToLower();
        string quality = request.Quality; // Kalidad ng liwanag sa camera

        // A. Kung "Squat" ang isinasagawa ng gumagamit
        if (exercise == "squat")
        {
            // I-deserialize muli ang state object patungong C# SquatState class upang mapanatili ang memorya ng repetitions.
            var stateJson = request.State?.ToJsonString() ?? "{}";
            var squatState = JsonSerializer.Deserialize<SquatState>(stateJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true // Huwag gawing sensitibo ang capitalization ng JSON properties
            }) ?? new SquatState();

            // Papatakbuhin ang static Squat physics mathematical calculations
            var result = PoseAnalyzer.AnalyzeSquat(request.Pose, squatState, quality);
            return Results.Ok(result); // Ibalik ang feedback message at rep count output sa format na JSON!
        }
        // B. Kung "Pushup" naman ang ehersisyo
        else if (exercise == "pushup")
        {
            // I-deserialize ang state patungong PushupState structure.
            var stateJson = request.State?.ToJsonString() ?? "{}";
            var pushupState = JsonSerializer.Deserialize<PushupState>(stateJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? new PushupState();

            // Papatakbuhin ang Push-Up angle checking program
            var result = PoseAnalyzer.AnalyzePushup(request.Pose, pushupState, quality);
            return Results.Ok(result); // Ibalik ang pushup status at corrections
        }
        // C. Kung "Plank" o "Forearm Plank"
        else if (exercise == "forearm_plank" || exercise == "plank")
        {
            // I-deserialize ang flexible state patungong PlankState model.
            var stateJson = request.State?.ToJsonString() ?? "{}";
            var plankState = JsonSerializer.Deserialize<PlankState>(stateJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? new PlankState();

            // Siyasatin ang posture structure kung pantay ang balakang laban sa balikat para sa Plank
            var result = PoseAnalyzer.AnalyzePlank(request.Pose, plankState, quality);
            return Results.Ok(result); // Ibalik ang metrics
        }
        // D. Kung di kilala ang ehersisyo, mag-error 400
        else
        {
            return Results.BadRequest(new { Error = $"Unsupported exercise type '{request.Exercise}'." });
        }
    }
    catch (Exception ex)
    {
        // Kung may pumalya sa mathematical operations, mahuli ang system logic exception gracefully nang hindi mamamatay ang app
        return Results.Problem($"An error occurred during pose calculation: {ex.Message}");
    }
});

// Run C# backend on port 5000
app.Run("http://localhost:5000");
