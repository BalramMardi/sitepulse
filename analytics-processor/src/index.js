const { Kafka } = require("kafkajs");
const Redis = require("ioredis");
const mongoose = require("mongoose");
const config = require("./config");
const express = require("express");
const client = require("prom-client");

// --- Prometheus Metrics Setup ---
const register = new client.Registry();
register.setDefaultLabels({
  app: "analytics-processor",
});
client.collectDefaultMetrics({ register });

const kafka_messages_consumed_total = new client.Counter({
  name: "kafka_messages_consumed_total",
  help: "Total messages consumed from Kafka",
  labelNames: ["topic"],
});
register.registerMetric(kafka_messages_consumed_total);

const kafka_messages_produced_total = new client.Counter({
  name: "kafka_messages_produced_total",
  help: "Total messages produced to Kafka",
  labelNames: ["topic"],
});
register.registerMetric(kafka_messages_produced_total);

const analytics_live_users = new client.Gauge({
  name: "analytics_live_users",
  help: "Current count of live users",
});
register.registerMetric(analytics_live_users);
// --- End Metrics Setup ---

const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers,
});

const consumer = kafka.consumer({ groupId: config.kafka.groupId });
const producer = kafka.producer();
const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
});

// --- In-memory maps for real-time dashboard ---
const activeUsers = new Map();
const pageCounts = new Map();

// --- MongoDB Schemas & Models ---
const ClickEventSchema = new mongoose.Schema(
  {
    cid: String,
    ts: { type: Date, default: Date.now },
    context: {
      url: String,
      path: String,
      pageW: Number,
      pageH: Number,
    },
    payload: {
      x: Number,
      y: Number,
      target: String,
    },
  },
  { timestamps: true }
);

const PageViewSchema = new mongoose.Schema(
  {
    path: { type: String, index: true },
    count: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const ClickEvent = mongoose.model("ClickEvent", ClickEventSchema);
const PageView = mongoose.model("PageView", PageViewSchema);

// --- End MongoDB Setup ---

async function connectToMongo() {
  try {
    await mongoose.connect(config.mongo.uri);
    console.log("MongoDB connected.");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  }
}

async function run() {
  await connectToMongo();
  await producer.connect();
  await consumer.connect();
  await consumer.subscribe({
    topic: config.kafka.topics.in,
    fromBeginning: false,
  });

  console.log("Analytics Processor running...");

  setInterval(aggregateAndProduce, config.aggInterval);

  // --- Start Metrics Server ---
  const metricsApp = express();
  metricsApp.get("/metrics", async (req, res) => {
    try {
      res.set("Content-Type", register.contentType);
      res.end(await register.metrics());
    } catch (ex) {
      res.status(500).end(ex);
    }
  });

  const METRICS_PORT = 9100;
  metricsApp.listen(METRICS_PORT, () => {
    console.log(`Metrics server listening on port ${METRICS_PORT}`);
  });
  // --- End Metrics Server ---

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        kafka_messages_consumed_total.inc({ topic });
        const event = JSON.parse(message.value.toString());
        const { cid, type, context, payload } = event;

        if (!cid) return;

        // 1. Update live session in Redis/in-memory
        activeUsers.set(cid, Date.now() + config.sessionTTL);

        if (type === "page_view" && context && context.path) {
          // Update in-memory for live dashboard
          const currentCount = pageCounts.get(context.path) || 0;
          pageCounts.set(context.path, currentCount + 1);

          // Update MongoDB for persistence
          await PageView.findOneAndUpdate(
            { path: context.path },
            { $inc: { count: 1 } },
            { upsert: true, new: true }
          );
        }

        if (type === "click") {
          // 2. Forward to click-stream for live heatmap
          await producer.send({
            topic: config.kafka.topics.outClick,
            messages: [{ value: JSON.stringify(event) }],
          });
          kafka_messages_produced_total.inc({
            topic: config.kafka.topics.outClick,
          });

          // 3. Save to MongoDB for persistence
          const clickDoc = new ClickEvent({
            cid: cid,
            ts: new Date(event.ts),
            context: context,
            payload: payload,
          });
          await clickDoc.save();
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    },
  });
}

async function aggregateAndProduce() {
  const now = Date.now();
  let liveCount = 0;

  // This logic remains the same, using the in-memory maps for speed
  activeUsers.forEach((expiry, cid) => {
    if (expiry > now) {
      liveCount++;
    } else {
      activeUsers.delete(cid);
    }
  });

  analytics_live_users.set(liveCount);

  const topPages = Array.from(pageCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }));

  const analyticsPayload = {
    liveCount,
    topPages,
    ts: now,
  };

  try {
    await producer.send({
      topic: config.kafka.topics.outAgg,
      messages: [{ value: JSON.stringify(analyticsPayload) }],
    });
    kafka_messages_produced_total.inc({ topic: config.kafka.topics.outAgg });
  } catch (error) {
    console.error("Failed to send aggregate analytics:", error);
  }
}

run().catch((e) => console.error("Analytics Processor failed:", e));
