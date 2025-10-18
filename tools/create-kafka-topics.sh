#!/bin/bash

DOCKER_CONTAINER="kafka"

docker exec -t $DOCKER_CONTAINER kafka-topics --create \
  --bootstrap-server localhost:9092 \
  --replication-factor 1 \
  --partitions 3 \
  --topic user-events

docker exec -t $DOCKER_CONTAINER kafka-topics --create \
  --bootstrap-server localhost:9092 \
  --replication-factor 1 \
  --partitions 1 \
  --topic dashboard-analytics

docker exec -t $DOCKER_CONTAINER kafka-topics --create \
  --bootstrap-server localhost:9092 \
  --replication-factor 1 \
  --partitions 1 \
  --topic click-stream

echo "Topics created:"
docker exec -t $DOCKER_CONTAINER kafka-topics --list --bootstrap-server localhost:9092