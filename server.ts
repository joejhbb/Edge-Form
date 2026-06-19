import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. Clean Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // 2. TTS Proxy Endpoint - Dual-source fallback to guarantee high-uptime voice stream serving
  app.get("/api/tts", async (req, res) => {
    try {
      const text = req.query.text as string;
      if (!text) {
        return res.status(400).send("Text parameter is required");
      }

      console.log(`[TTS Backend Proxy] Fetching audio for text: "${text.substring(0, 40)}..."`);

      // URL 1: Google Translate TTS (highly-available, CORS-free, no authentication)
      const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(text)}`;
      
      // URL 2: StreamElements TTS (Fallback) - Choose a clear, friendly female voice (Amy) to match Google's female voice perfectly
      const voice = (req.query.voice as string) || "Amy";
      const streamElementsUrl = `https://api.streamelements.com/kappa/v2/speech?voice=${encodeURIComponent(voice)}&text=${encodeURIComponent(text)}`;

      let response;
      let usedSource = "Google Translate";

      try {
        console.log(`[TTS Backend Proxy] Trying Google Translate TTS...`);
        response = await fetch(googleTtsUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
          }
        });

        if (!response.ok) {
          throw new Error(`Google Translate status: ${response.status}`);
        }
      } catch (err: any) {
        console.warn(`[TTS Backend Proxy] Google Translate failed (${err.message || err}). Trying StreamElements...`);
        usedSource = "StreamElements";
        response = await fetch(streamElementsUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
          }
        });
      }

      if (!response || !response.ok) {
        throw new Error(`Both Google Translate and StreamElements backends failed. Last response status: ${response?.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      console.log(`[TTS Backend Proxy] Successfully fetched audio using ${usedSource} (${arrayBuffer.byteLength} bytes)`);
      
      res.set("Content-Type", "audio/mpeg");
      res.set("Cache-Control", "public, max-age=86400"); // Cache it to avoid repeated hits
      res.send(Buffer.from(arrayBuffer));
    } catch (error: any) {
      console.error("[TTS Backend Proxy Error]:", error.message || error);
      res.status(500).send("TTS proxy failed to retrieve voice content from all upstream sources");
    }
  });

  // 3. Vite development middleware or production static asset server
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[EdgeForm Server] Ready & running!`);
    console.log(`  - Local:    http://localhost:${PORT}`);
    console.log(`  - Network:  http://127.0.0.1:${PORT}`);
  });
}

startServer();
