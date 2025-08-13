// custom-tunnel-server.js
const express = require("express");
const { WebSocketServer } = require("ws");
const { v4: uuid } = require("uuid");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 3000;
const clients = {};

app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.text({ type: 'text/html', limit: '10mb' }));

const wss = new WebSocketServer({ 
  noServer: true,
maxPayload: 50 * 1024 * 1024
});



wss.on("connection", (ws) => {
  const id = uuid();
  clients[id] = ws;

  ws.on("close", () => {
    delete clients[id];
  });

ws.on("message", async (data) => {
  const message = JSON.parse(data);
  const { id, status, body, isBase64, headers } = message;

  if (pending[id]) {
    const res = pending[id].res;

    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        res.setHeader(key, value);
      }
    }

if (isBase64) {
  const buffer = Buffer.from(body, 'base64');
  res.setHeader('Content-Type', headers['content-type'] || 'application/pdf');
  res.setHeader('Content-Disposition', headers['content-disposition'] || 'attachment; filename="resume.pdf"');
  res.status(status).send(buffer); // ✅ Send actual binary
}

 else {
  // Try to parse as JSON safely, or wrap as string
try {
  // If Content-Type is application/json, parse it
  if (headers["content-type"] && headers["content-type"].includes("application/json")) {
    const parsed = JSON.parse(body);
    res.status(status).json(parsed);
  } else {
    res.status(status).send(body); // Just send the raw text
  }
} catch {
  res.status(status).send(body); // Fallback
}

}


    delete pending[id];
  }
});

});

const pending = {};

app.all("*", (req, res) => {
  const client = Object.values(clients)[0]; // Take first connected local app

  if (!client) return res.status(503).send("No tunnel connected.");

  const id = uuid();

  pending[id] = { res };

  client.send(
    JSON.stringify({
      id,
      method: req.method,
      path: req.path,
      headers: req.headers,
      body: req.body,
    })
  );
});

const server = app.listen(port, () => {
  console.log(`Tunnel server running on port ${port}`);
});

server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});







