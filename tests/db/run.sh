#!/bin/sh
# Prova lo schema del database (supabase.sql) su un vero Postgres, con utenti diversi: serve Docker.
set -e
cd "$(dirname "$0")"
docker rm -f cuoricino-pg >/dev/null 2>&1 || true
docker run -d --name cuoricino-pg -e POSTGRES_PASSWORD=x postgres:16-alpine >/dev/null
sleep 6
docker exec -i cuoricino-pg psql -U postgres -v ON_ERROR_STOP=1 -q < prep.sql
docker exec -i cuoricino-pg psql -U postgres -v ON_ERROR_STOP=1 -q < ../../supabase.sql >/dev/null 2>&1
docker exec -i cuoricino-pg psql -U postgres -q -t -A < test.sql 2>&1 | grep -v '^$' | sed 's/^psql:[^ ]* NOTICE:  //'
docker rm -f cuoricino-pg >/dev/null
