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
  mongo: {
    uri: process.env.MONGO_URI || "mongodb://mongo:27017/analytics",
  },
  sessionTTL: parseInt(process.env.SESSION_TTL_MS || "10000", 10), // Using the 10-sec TTL
  aggInterval: 2000,
};
