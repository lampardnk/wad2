#!/usr/bin/env bash
# CI only: start the server against the empty test database and make the test account.
set -e
for i in $(seq 30); do (echo > /dev/tcp/localhost/27017) 2>/dev/null && break; sleep 1; done # wait for MongoDB
(cd server && node index.js > ../server.log 2>&1 &)
for i in $(seq 30); do curl -sf http://localhost:3000/api/health && break; sleep 1; done
curl -sf -X POST http://localhost:3000/api/auth/register -H 'Content-Type: application/json' \
  -d "{\"name\":\"Test User\",\"username\":\"$TEST_USERNAME\",\"email\":\"$TEST_USERNAME@example.com\",\"password\":\"$TEST_PASSWORD\"}" > /dev/null
echo "Server up, test account $TEST_USERNAME created"
