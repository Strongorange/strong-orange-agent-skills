const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 7827;

http
  .createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.end();
      return;
    }
    if (req.method !== "POST") {
      res.writeHead(405);
      res.end();
      return;
    }

    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        if (payload.logFile) {
          fs.mkdirSync(path.dirname(payload.logFile), { recursive: true });
          fs.appendFileSync(payload.logFile, body + "\n");
        }
        res.writeHead(200);
        res.end("ok");
      } catch {
        res.writeHead(400);
        res.end("bad request");
      }
    });
  })
  .listen(PORT, () => console.log(`[debug-server] :${PORT}`));
