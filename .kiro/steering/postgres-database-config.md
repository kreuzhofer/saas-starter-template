---
inclusion: always
---

# PostgreSQL Config

**Credentials:** `clicktracking` / `password` @ `db:5432/clicktracking`

```
# Docker internal
DATABASE_URL=postgresql://clicktracking:password@db:5432/clicktracking

# Host machine
DATABASE_URL=postgresql://clicktracking:password@localhost:5432/clicktracking
```

**Commands:**
```bash
# SQL query
docker compose exec -T db psql -U clicktracking -d clicktracking -c "SELECT..."

# Shell access
docker compose exec db psql -U clicktracking -d clicktracking

# Migrations
npm run prisma:migrate
```

⚠️ **Always use user `clicktracking`** — `postgres` user does not exist.
