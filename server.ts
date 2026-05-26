import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable JSON request body parsing for API endpoints
  app.use(express.json());

  // API dynamic password verification endpoint for host execution
  app.post("/api/verify-admin", (req: any, res: any) => {
    const { password } = req.body;
    const correctPass = process.env.VITE_ADMIN_PASSWORD || "crackadmin";
    const enteredPass = (password || "").trim();
    const isValid = enteredPass === correctPass || enteredPass.toLowerCase() === correctPass.toLowerCase();
    res.json({ valid: isValid });
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
    console.log(`CrackChat server running on http://localhost:${PORT}`);
  });
}

startServer();
