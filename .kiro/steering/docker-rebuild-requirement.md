---
inclusion: always
---

# Docker Rebuild After Code Changes

⚠️ **CRITICAL: You MUST rebuild containers after ANY code change. DO NOT just tell the user to rebuild - execute the command yourself.**

| Changed | Command |
|---------|---------|
| `src/**` | `docker compose up -d --build app` |
| `frontend/**` | `docker compose up -d --build frontend` |
| Both | `docker compose up -d --build` |

❌ `docker compose restart` does NOT pick up changes
✅ Always `--build` to include new code
✅ **Always run the rebuild command yourself after code changes**
