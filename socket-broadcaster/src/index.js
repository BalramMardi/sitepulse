require("dotenv").config();
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const { Kafka } = require("kafkajs");
const socketHandlers = require("./socketHandlers");
const client = require("prom-client");

// --- Prometheus Metrics Setup ---
const register = new client.Registry();
register.setDefaultLabels({
  app: "socket-broadcaster",
});
client.collectDefaultMetrics({ register });

const socket_connections_total = new client.Gauge({
  name: "socket_connections_total",
  help: "Total active socket.io connections",
});
register.registerMetric(socket_connections_total);

// We'll pass these metrics to the socket handler
const metrics = {
  kafka_messages_consumed_total: new client.Counter({
    name: "kafka_messages_consumed_total",
    help: "Total messages consumed from Kafka",
    labelNames: ["topic"],
  }),
  socket_events_emitted_total: new client.Counter({
    name: "socket_events_emitted_total",
    help: "Total events emitted via socket.io",
    labelNames: ["event"],
  }),
};
register.registerMetric(metrics.kafka_messages_consumed_total);
register.registerMetric(metrics.socket_events_emitted_total);
// --- End Metrics Setup ---

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const kafka = new Kafka({
  clientId: "socket-broadcaster",
  brokers: [process.env.KAFKA_BROKERS || "localhost:29092"],
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket_connections_total.inc();
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    socket_connections_total.dec();
  });
});

// --- Expose Metrics Endpoint ---
app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});
// --- End Metrics Endpoint ---

socketHandlers.init(io, kafka, metrics); // Pass metrics to handler

const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`Socket.io server listening on port ${port}`);
});
