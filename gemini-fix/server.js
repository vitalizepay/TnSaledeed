// server.js (multi-key with logging + failover)
import express from "express";
import morgan from "morgan";
import { fetch } from "undici";

const GEMINI_ROOT = "https://generativelanguage.googleapis.com";
const PORT = process.env.PORT || 8080;

// Support multiple keys (comma-separated)
const { GEMINI_API_KEYS, PROXY_TOKEN, ALLOWED_ORIGINS } = process.env;
if (!GEMINI_API_KEYS) {
  console.error("GEMINI_API_KEYS env var is not set");
  process.exit(1);
}
const apiKeys = GEMINI_API_KEYS.split(",").map(s => s.trim()).filter(Boolean);
if (apiKeys.length === 0) {
  console.error("No valid keys found in GEMINI_API_KEYS");
  process.exit(1);
}

const allowedOrigins = (ALLOWED_ORIGINS ?? "")
  .split(",").map(s => s.trim()).filter(Boolean);

const app = express();
app.disable("x-powered-by");
app.use(morgan("tiny"));
app.use(express.json({ limit: "50mb" }));

// --- CORS ---
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!allowedOrigins.length || !origin || allowedOrigins.includes(origin)) {
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-proxy-token");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    if (req.method === "OPTIONS") return res.status(204).end();
    return next();
  }
  return res.status(403).json({ error: "Origin not allowed" });
});

// --- Shared-secret guard ---
app.use((req, res, next) => {
  if (PROXY_TOKEN && req.headers["x-proxy-token"] !== PROXY_TOKEN) {
    return res.status(401).json({ error: "Missing or invalid x-proxy-token" });
  }
  next();
});

app.get("/healthz", (_req, res) => res.send("ok"));

// --- Proxy with key rotation + logging ---
app.all("/v1beta/*", async (req, res) => {
  const hasBody = !["GET", "HEAD"].includes(req.method);

  for (let i = 0; i < apiKeys.length; i++) {
    const key = apiKeys[i];
    const upstream = new URL(GEMINI_ROOT + req.originalUrl);
    upstream.searchParams.set("key", key);

    try {
      const upstreamResp = await fetch(upstream, {
        method: req.method,
        headers: { "content-type": req.headers["content-type"] || "application/json" },
        body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
      });

      // If response looks like a quota/auth error, try next key
      if ([401, 403, 429, 500, 502, 503].includes(upstreamResp.status)) {
        console.warn(
          `⚠️ Key[${i}] failed with status ${upstreamResp.status}. Trying next key...`
        );
        continue;
      }

      // Success – stream result back
      res.status(upstreamResp.status);
      const ct = upstreamResp.headers.get("content-type");
      if (ct) res.setHeader("content-type", ct);
      const ab = await upstreamResp.arrayBuffer();
      res.end(Buffer.from(ab));

      console.log(`✅ Request served using Key[${i}]`);
      return; // stop after success
    } catch (err) {
      console.error(`❌ Network error with Key[${i}]:`, err.message);
      continue; // try next key
    }
  }

  // All keys failed
  console.error("🚨 All API keys failed for this request");
  res.status(502).json({ error: "All upstream keys failed" });
});

app.listen(PORT, () => console.log(`proxy listening on :${PORT}`));
