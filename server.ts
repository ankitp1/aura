import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { OAuth2Client } from "google-auth-library";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Google OAuth Client setup
  // Note: Users need to provide GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Secrets
  const getOAuthClient = () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.APP_URL}/auth/callback`;

    return new OAuth2Client(clientId, clientSecret, redirectUri);
  };

  app.use(express.json());
  
  // Disable strict COOP/COEP to allow Firebase Auth popups to communicate
  app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    next();
  });

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Image Proxy to bypass CORS for html2canvas
  app.get("/api/proxy-image", async (req, res) => {
    try {
      const imageUrl = req.query.url as string;
      if (!imageUrl) {
        return res.status(400).send("No URL provided");
      }

      console.log(`[Proxy] Fetching: ${imageUrl.substring(0, 50)}...`);

      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        console.error(`[Proxy] Fetch failed: ${response.status} ${response.statusText}`);
        return res.status(response.status).send(`Failed to fetch image: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }
      
      // The magic header that bypasses the canvas CORS block
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=31536000");

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Ensure we end the response correctly
      res.end(buffer);
    } catch (error) {
      console.error("[Proxy] Critical error:", error);
      res.status(500).send("Failed to proxy image");
    }
  });

  // OAuth URL for Google Photos
  app.get("/api/auth/google/url", (req, res) => {
    try {
      const client = getOAuthClient();
      const url = client.generateAuthUrl({
        access_type: "offline",
        scope: [
          "https://www.googleapis.com/auth/photoslibrary.readonly",
          "https://www.googleapis.com/auth/userinfo.profile",
          "https://www.googleapis.com/auth/userinfo.email",
        ],
        prompt: "consent",
      });
      res.json({ url });
    } catch (error) {
      console.error("OAuth URL error:", error);
      res.status(500).json({ error: "Failed to generate auth URL" });
    }
  });

  // OAuth Callback Handler
  app.get("/auth/callback", async (req, res) => {
    const { code } = req.query;
    if (typeof code !== "string") {
      return res.status(400).send("No code provided");
    }

    try {
      const client = getOAuthClient();
      const { tokens } = await client.getToken(code);
      
      // FAILSAFE: Strictly check for the exact readonly scope
      if (!tokens.scope?.includes("https://www.googleapis.com/auth/photoslibrary.readonly")) {
        return res.send(`
          <html>
            <body style="background: #000; color: #fff; text-align: center; font-family: sans-serif; padding: 50px; line-height: 1.6;">
              <h1 style="color: #ef4444;">CRITICAL PERMISSION ERROR</h1>
              <p style="font-size: 18px;">Google successfully authenticated you, but <strong>refused</strong> to grant access to your Photos.</p>
              
              <div style="background: #111; padding: 20px; border-radius: 8px; margin: 20px auto; max-width: 600px; text-align: left; border: 1px solid #333;">
                <p style="color: #aaa; font-family: monospace; font-size: 12px; margin-bottom: 10px;">RAW GRANTED SCOPES:</p>
                <code style="color: #fbbf24; word-break: break-all;">${tokens.scope}</code>
              </div>

              <div style="max-width: 600px; margin: 0 auto; text-align: left;">
                <p>This happens for exactly two reasons:</p>
                <ol>
                  <li style="margin-bottom: 10px;"><strong>You didn't check the box:</strong> On the previous screen, you must explicitly click the checkbox next to "See your Google Photos".</li>
                  <li><strong>Wrong Project API:</strong> The "Google Photos Library API" is enabled in a <em>different</em> Google Cloud project. It must be enabled in the exact project that owns the Client ID <code>${process.env.GOOGLE_CLIENT_ID}</code>.</li>
                </ol>
              </div>
            </body>
          </html>
        `);
      }

      // In a real app, you'd store these tokens securely (e.g. Firestore)
      
      res.send(`
        <html>
          <body style="background: #000; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
            <div style="text-align: center;">
              <h2 style="font-weight: 300; letter-spacing: 2px;">LUXE LENS</h2>
              <p style="opacity: 0.6; font-size: 14px;">Identity verified. Syncing your wardrobe...</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ 
                    type: 'GOOGLE_AUTH_SUCCESS', 
                    tokens: ${JSON.stringify(tokens)} 
                  }, '*');
                  window.close();
                } else {
                  window.location.href = '/';
                }
              </script>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("OAuth callback error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  // Vite middleware for development
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
    console.log(`LuxeLens server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
