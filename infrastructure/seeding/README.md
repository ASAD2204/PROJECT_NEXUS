# Database Seeding Scripts

> **Status: 100% COMPLETED** - All development, integration, and testing phases are finished.


This folder contains reusable, idempotent seed scripts for Project Nexus databases.

## Structure

- `postgres/seed-dev.sql`: development seed data for PostgreSQL
- `mongo/seed-dev.js`: development seed data for MongoDB
- `scripts/seed-all.ps1`: run both seeds from Windows PowerShell
- `scripts/seed-all.sh`: run both seeds from Linux/macOS shell

## Prerequisites

- Docker is running
- Stack databases are up (`postgres` and `mongodb` containers)
- PostgreSQL schema has already been initialized from `infrastructure/postgres/init.sql`
- MongoDB base indexes have already been initialized from `infrastructure/mongo/init-mongo.js`

## Run (Windows)

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
./infrastructure/seeding/scripts/seed-all.ps1
```

Optional explicit container names:

```powershell
./infrastructure/seeding/scripts/seed-all.ps1 -PostgresContainer nexus_postgres.1.xxxxx -MongoContainer nexus_mongodb.1.xxxxx
```

## Run (Linux/macOS)

```bash
chmod +x infrastructure/seeding/scripts/seed-all.sh
./infrastructure/seeding/scripts/seed-all.sh
```

Optional explicit container names:

```bash
./infrastructure/seeding/scripts/seed-all.sh nexus_postgres_1 nexus_mongodb_1
```

## Notes

- Scripts are idempotent and safe to re-run.
- Seeds are designed for development and demos, not production.
- Default credentials/values are intentionally non-sensitive.
