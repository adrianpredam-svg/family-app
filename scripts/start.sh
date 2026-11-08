#!/bin/sh
# Container start: update the database, make sure family members exist, start the app.
set -e
node scripts/migrate.mjs
node scripts/seed.mjs
exec node server.js
