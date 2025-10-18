const express = require("express");
const cors = require("cors");
const { Kafka } = require("kafkajs");
const config = require("./config");
const client = require("prom-client");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.text({ type: "text/plain" }));

const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers,
});

const producer = kafka.producer();
let producerReady = false;

// --- Prometheus Metrics Setup ---
const register = new client.Registry();
register.setDefaultLabels({
  app: "tracking-api",
});
client.collectDefaultMetrics({ register });

const http_requests_total = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});
register.registerMetric(http_requests_total);

const kafka_messages_produced_total = new client.Counter({
  name: "kafka_messages_produced_total",
  help: "Total number of messages produced to Kafka",
  labelNames: ["topic"],
});
register.registerMetric(kafka_messages_produced_total);
// --- End Metrics Setup ---

async function initProducer() {
  try {
    await producer.connect();
    producerReady = true;
    console.log("Kafka Producer connected.");
  } catch (error) {
    console.error("Failed to connect Kafka Producer:", error);
    process.exit(1);
  }
}

app.post("/track", async (req, res) => {
  if (!producerReady) {
    http_requests_total.inc({
      method: "POST",
      route: "/track",
      status_code: 503,
    });
    return res.status(503).json({ error: "Service unavailable" });
  }

  try {
    const event =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (!event || !event.type || !event.cid) {
      http_requests_total.inc({
        method: "POST",
        route: "/track",
        status_code: 400,
      });
      return res.status(400).json({ error: "Invalid event" });
    }

    await producer.send({
      topic: config.kafka.topic,
      messages: [
        {
          key: event.cid,
          value: JSON.stringify(event),
        },
      ],
    });

    kafka_messages_produced_total.inc({ topic: config.kafka.topic });
    http_requests_total.inc({
      method: "POST",
      route: "/track",
      status_code: 202,
    });
    res.status(202).send();
  } catch (error) {
    console.error("Error processing event:", error);
    http_requests_total.inc({
      method: "POST",
      route: "/track",
      status_code: 500,
    });
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", producerReady });
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

app.listen(config.port, () => {
  initProducer();
  console.log(`Tracking API listening on port ${config.port}`);
});
