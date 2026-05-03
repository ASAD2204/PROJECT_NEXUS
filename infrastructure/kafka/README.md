# Kafka Infrastructure

> **Status: 100% COMPLETED** - All development, integration, and testing phases are finished.


This folder contains operational helpers for Kafka topic bootstrap in Project Nexus.

## Topics used by services

- grade_submitted: LMS -> SIS transcript recalculation
- assignment_due: LMS -> downstream reminder consumers
- attendance_marked: Attendance -> downstream analytics/notifications
- payment_processed: Finance -> downstream accounting/notifications

## Create topics (PowerShell)

From workspace root:

```powershell
Set-Location "f:\BS IT\Project_Nexus"
powershell -ExecutionPolicy Bypass -File .\infrastructure\kafka\create-topics.ps1
```

## Create topics (Linux/macOS shell)

From workspace root:

```sh
chmod +x ./infrastructure/kafka/create-topics.sh
./infrastructure/kafka/create-topics.sh
```

## Notes

- Scripts assume broker endpoint kafka:9092 (same as docker-compose service name).
- Scripts are idempotent and safe to rerun.
- If Kafka is not healthy yet, rerun after broker startup completes.
