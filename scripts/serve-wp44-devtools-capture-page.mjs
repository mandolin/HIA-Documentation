import { createServer } from "node:http";

const host = "127.0.0.1";
const port = Number.parseInt(process.env.HIA_WP44_DEVTOOLS_CAPTURE_PORT || "44744", 10);
const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>HIA DevTools Capture Page</title>
    <style>
      body {
        color: #111827;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.5;
        margin: 2rem;
      }

      code,
      pre {
        font-family: "Sarasa Mono SC", "等距更纱黑体 SC", "Cascadia Mono", Consolas, monospace;
      }

      pre {
        background: #f3f4f6;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        padding: 1rem;
        white-space: pre-wrap;
      }
    </style>
  </head>
  <body>
    <h1>HIA DevTools Capture Page</h1>
    <p>
      This local page is used only for W-P44.3 Chrome DevTools manual capture.
      It records <code>hia:devtools-open-request</code> events without sending data anywhere.
    </p>
    <p>
      本地页面仅用于 W-P44.3 Chrome DevTools 手工采集。它只记录
      <code>hia:devtools-open-request</code> 事件，不上传、不写入、不执行目标项目命令。
    </p>
    <pre id="hia-log">waiting-for-hia-devtools-open-request</pre>
    <script>
      const log = document.getElementById("hia-log");
      window.addEventListener("hia:devtools-open-request", (event) => {
        const detail = event.detail || {};
        const message = detail.message || {};
        const request = message.request || {};
        const summary = {
          contract: detail.contract || null,
          eventType: detail.eventType || null,
          requestType: request.type || null,
          relationId: message.metadata && message.metadata.relationId || null,
          status: "received"
        };

        log.textContent = JSON.stringify(summary, null, 2);
        console.log("HIA_DEVTOOLS_OPEN_REQUEST", summary);
      });
    </script>
  </body>
</html>`;

const server = createServer((request, response) => {
  if (request.url === "/favicon.ico") {
    response.writeHead(204, {
      "cache-control": "no-store"
    });
    response.end();
    return;
  }

  if (request.url === "/" || request.url === "/index.html") {
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": "text/html; charset=utf-8"
    });
    response.end(html);
    return;
  }

  response.writeHead(404, {
    "content-type": "text/plain; charset=utf-8"
  });
  response.end("not found");
});

server.listen(port, host, () => {
  console.log(`W-P44 DevTools capture page: http://${host}:${port}/`);
  console.log("Keep this process running while you test the HIA DevTools panel.");
});

process.on("SIGINT", () => {
  server.close(() => {
    process.exit(0);
  });
});
