const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DB_FILE = path.join(DATA_DIR, "records.json");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".ico": "image/x-icon",
};

function ensureDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "{}", "utf8");
}

function readDb() {
  ensureDb();
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8") || "{}");
  } catch {
    return {};
  }
}

function writeDb(db) {
  ensureDb();
  const tmp = `${DB_FILE}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
  fs.renameSync(tmp, DB_FILE);
}

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 5_000_000) reject(new Error("Request body too large"));
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
  });
}

async function handleApi(req, res, url) {
  if (req.method === "OPTIONS") return send(res, 204, "");

  const key = decodeURIComponent(url.pathname.replace(/^\/api\/records\/?/, ""));
  const db = readDb();

  if (url.pathname === "/api/health") {
    return send(res, 200, JSON.stringify({ ok: true, records: Object.keys(db).length }));
  }

  if (url.pathname === "/api/records" && req.method === "GET") {
    const rows = Object.entries(db).map(([recordKey, record]) => ({
      key: recordKey,
      value: record.value,
      updatedAt: record.updatedAt,
    }));
    return send(res, 200, JSON.stringify(rows));
  }

  if (!key) return send(res, 404, JSON.stringify({ error: "Not found" }));

  if (req.method === "PUT") {
    const payload = await parseBody(req);
    db[key] = { value: payload.value, updatedAt: new Date().toISOString() };
    writeDb(db);
    return send(res, 200, JSON.stringify({ ok: true }));
  }

  if (req.method === "DELETE") {
    delete db[key];
    writeDb(db);
    return send(res, 200, JSON.stringify({ ok: true }));
  }

  return send(res, 405, JSON.stringify({ error: "Method not allowed" }));
}

function serveStatic(req, res, url) {
  const requested = url.pathname === "/" ? "/ISS Improved.html" : url.pathname;
  const filePath = path.normalize(path.join(ROOT, requested));
  if (!filePath.startsWith(ROOT)) return send(res, 403, "Forbidden", "text/plain; charset=utf-8");

  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, "Not found", "text/plain; charset=utf-8");
    send(res, 200, data, MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream");
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api/")) {
    handleApi(req, res, url).catch((error) => send(res, 400, JSON.stringify({ error: error.message })));
    return;
  }
  serveStatic(req, res, url);
});

server.listen(PORT, () => {
  console.log(`ISS portal running at http://localhost:${PORT}`);
  console.log(`Shared storage file: ${DB_FILE}`);
});
