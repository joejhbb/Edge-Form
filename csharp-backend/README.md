# C# Posture and Gesture Detection Engine (The Brain of the Application)

As required by your project guidelines, this application features a **full-powered C# backend** that serves as the "brain of the system." It handles real-time posture analysis, coordinates, angle mathematics, joint limit validation, and repetition counting for both squats and push-ups.

---

## 🧠 Behind the Scenes: How the Brain Works

1. **Computer Vision (Client Page):**
   The browser uses Google MediaPipe to capture video coordinates from your webcam at 30 FPS. It maps 33 key joints of your skeleton in 2D/3D space.

2. **Analysis Routing:**
   You can choose between:
   - **Local Web Browser (Zero Latency TS/JS Engine):** Runs directly in the browser.
   - **C# ASP.NET Core Backend (Port 5000):** Sends the joint coordinate payloads via HTTP POST to the C# Web API on every frame, allowing C# to perform the joint math and command posture adjustments!

3. **C# Coordinate calculations:**
   Inside `Services/PoseAnalyzer.cs`, C# computes the angle between intersecting vectors using the high-accuracy Trigonometric inverse tangents ($Atan2$):
   $$\theta = \cos^{-1}\left(\frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\|\|\vec{v}\|}\right)$$
   It then cross-checks:
   - **Width Ratio:** Hand and foot base structures relative to shoulder width to reject squats with feet too close together or push-ups with dangerously narrow arm positions.
   - **Knee valgus detection:** Knees folding inward.
   - **Tilt Slant:** Vertical camera alignment to alert the user if they're leaning crooked ("Nakatabingi").
   - **Extreme limits:** Squatting way too low ("sobrang baba") below 80° knee flexion to block reps and protect mechanical knee joint stress.

---

## 🛠️ Step-by-Step Guide: How to Run the C# Server Locally

When exporting, presentation day, or running locally, follow these steps:

### Prerequisite
Install the official **.NET 8 SDK** (or .NET 9) on your computer:
👉 [Download .NET Developer SDK](https://dotnet.microsoft.com/en-us/download)

### Step 1: Fire up the C# Server
1. Open a terminal (CMD, PowerShell, or bash) in the `/csharp-backend` directory.
2. Build and launch the application using the dotnet CLI:
   ```bash
   dotnet run
   ```
3. You will see the terminal output indicating the server is running:
   ```text
   Building...
   info: Microsoft.Hosting.Lifetime[14]
         Now listening on: http://localhost:5000
   info: Microsoft.Hosting.Lifetime[0]
         Application started. Press Ctrl+C to shut down.
   ```

### Step 2: Test the Endpoint (Optional)
Open `http://localhost:5000/` in your web browser. You should receive a diagnostic JSON confirmation:
```json
{
  "system": "C# Gesture & Posture Engine",
  "status": "Online",
  "version": "1.0.0"
}
```

### Step 3: Train with C# in the Web App!
1. Turn on the Web App.
2. Go to the **Workout (Tirador) section**.
3. In the right-side control cards or under setting controls, switch **Analysis Engine** from **Local Browser** to **C# Web Server (Localhost)**.
4. Set up in front of the camera. The C# "brain" is now actively calculating your repetition counts and form feedback checks in real-time!
