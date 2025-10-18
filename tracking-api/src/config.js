require("dotenv").config();

module.exports = {
  port: process.env.PORT || 4000,
  kafka: {
    brokers: [process.env.KAFKA_BROKERS || "localhost:29092"],
    clientId: "tracking-api",
    topic: "user-events",
  },
};
