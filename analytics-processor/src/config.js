require("dotenv").config();

module.exports = {
  kafka: {
    brokers: [process.env.KAFKA_BROKERS || "localhost:29092"],
    clientId: "analytics-processor",
    groupId: "analytics-group",
    topics: {
      in: "user-events",
      outAgg: "dashboard-analytics",
      outClick: "click-stream",
    },
  },
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: 6379,
  },
  sessionTTL: parseInt(process.env.SESSION_TTL_MS || "300000", 10),
  aggInterval: 2000,
};
