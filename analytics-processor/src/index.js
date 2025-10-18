const { Kafka } = require("kafkajs");
const Redis = require("ioredis");
const config = require("./config");

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

const activeUsers = new Map();
const pageCounts = new Map();

async function run() {
  await producer.connect();
  await consumer.connect();
  await consumer.subscribe({
    topic: config.kafka.topics.in,
    fromBeginning: false,
  });

  console.log("Analytics Processor running...");

  setInterval(aggregateAndProduce, config.aggInterval);

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        const { cid, type, context, payload } = event;

        if (!cid) return;

        activeUsers.set(cid, Date.now() + config.sessionTTL);

        if (type === "page_view" && context && context.path) {
          const currentCount = pageCounts.get(context.path) || 0;
          pageCounts.set(context.path, currentCount + 1);
        }

        if (type === "click") {
          await producer.send({
            topic: config.kafka.topics.outClick,
            messages: [{ value: JSON.stringify(event) }],
          });
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

  activeUsers.forEach((expiry, cid) => {
    if (expiry > now) {
      liveCount++;
    } else {
      activeUsers.delete(cid);
    }
  });

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
  } catch (error) {
    console.error("Failed to send aggregate analytics:", error);
  }
}

run().catch((e) => console.error("Analytics Processor failed:", e));
