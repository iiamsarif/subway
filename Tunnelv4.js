// custom-tunnel-server.js
const express = require("express");
const { WebSocketServer } = require("ws");
const { v4: uuid } = require("uuid");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 3000;
const clients = {};

app.use(bodyParser.json());

const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws) => {
  const id = uuid();
  clients[id] = ws;

  ws.on("close", () => {
    delete clients[id];
  });

  ws.on("message", async (data) => {
    const message = JSON.parse(data);
    const { id, status, body } = message;

    // Forward response to original HTTP requester
    if (pending[id]) {
      pending[id].res.status(status).send(body);
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
