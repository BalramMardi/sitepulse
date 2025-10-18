const express = require("express");
const cors = require("cors");
const { Kafka } = require("kafkajs");
const config = require("./config");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.text({ type: "text/plain" })); // For sendBeacon

const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers,
});

const producer = kafka.producer();
let producerReady = false;

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
    return res.status(503).json({ error: "Service unavailable" });
  }

  try {
    const event =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (!event || !event.type || !event.cid) {
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

    res.status(202).send();
  } catch (error) {
    console.error("Error processing event:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", producerReady });
});

app.listen(config.port, () => {
  initProducer();
  console.log(`Tracking API listening on port ${config.port}`);
});
