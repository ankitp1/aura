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

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
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
      
      // In a real app, you'd store these tokens securely (e.g. Firestore)
      // For this demo, we'll pass them back to the frontend via postMessage
      
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
