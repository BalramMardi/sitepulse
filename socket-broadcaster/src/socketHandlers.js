const TOPIC_ANALYTICS = "dashboard-analytics";
const TOPIC_CLICKS = "click-stream";
const GROUP_ID = "socket-broadcaster-group";

async function createConsumer(kafka, topic, onMessage) {
  const consumer = kafka.consumer({ groupId: `${GROUP_ID}-${topic}` });
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        onMessage(JSON.parse(message.value.toString()));
      } catch (e) {
        console.error(`Failed to process message from ${topic}`, e);
      }
    },
  });
  return consumer;
}

async function init(io, kafka) {
  try {
    await createConsumer(kafka, TOPIC_ANALYTICS, (data) => {
      io.emit("analytics-update", data);
    });
    console.log("Consuming analytics topic");

    await createConsumer(kafka, TOPIC_CLICKS, (data) => {
      io.emit("new-click", data);
    });
    console.log("Consuming click-stream topic");
  } catch (error) {
    console.error("Failed to start Kafka consumers for sockets:", error);
    process.exit(1);
  }
}

module.exports = { init };
