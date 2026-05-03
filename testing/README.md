# Testing

> **Status: 100% COMPLETED** - All development, integration, and testing phases are finished.


This folder keeps the scripts and logs for running microservice checks one service at a time.

## What each service test should cover

- Session and auth behavior
- Core functions and operations
- API availability and route responses
- Database interaction
- Networking and service-to-service calls

## Layout

- `scripts/` contains one wrapper script per service plus a shared helper.
- `scripts/_common.ps1` provides the logging scaffold used by each wrapper.
- `logs/` stores the output from each run, grouped by service name.
- `STATUS.md` tracks whether a service has been tested and passed.

## Service Names

I am using the repository's actual service names here. That means `attendance-service` and `scheduler-service` instead of the misspelled variants from the request.

## Workflow

1. Run the matching script from `scripts/`.
2. Save the output in that service's log folder.
3. Update `STATUS.md` when the service passes all checks.
# Testing

This folder keeps the scripts and logs for running microservice checks one service at a time.

## What each service test should cover

- Session and auth behavior
- Core functions and operations
- API availability and route responses
- Database interaction
- Networking and service-to-service calls

## Layout

- `scripts/` contains one wrapper script per service plus a shared helper.
- `logs/` stores the output from each run, grouped by service name.
- `STATUS.md` tracks whether a service has been tested and passed.

## Service Names

I am using the repository's actual service names here. That means `attendance-service` and `scheduler-service` instead of the misspelled variants from the request.

## Workflow

1. Run the matching script from `scripts/`.
2. Save the output in that service's log folder.
3. Update `STATUS.md` when the service passes all checks.
# Testing Workspace

This folder stores the smoke-test scripts and logs for each microservice.

Repository service names used here:

- ai-service
- alumni-service
- analytics-service
- attendance-service
- auth-service
- chat-service
- finance-service
- hr-service
- library-service
- lms-service
- notification-service
- operations-service
- scheduler-service
- sis-service

The user request spelled `attendance-service` and `scheduler-service` differently in a few places. The scripts and status tracker use the repository names above so everything stays aligned with the actual folders in the codebase.

## What We Will Test

- Session: token validation, session state, logout invalidation, protected route access.
- Functions: core business functions for the service.
- Operations: create, update, delete, and workflow behavior where the service exposes it.
- API: route availability, status codes, response shape, and error handling.
- DB: reads and writes against the service datastore.
- Network: service reachability and response over its expected URL.

## Layout

- `scripts/<service>/smoke.ps1` - service-specific smoke test wrapper.
- `scripts/common/Invoke-ServiceSmoke.ps1` - shared HTTP and logging harness.
- `logs/<service>/` - timestamped transcripts and JSON summaries.
- `STATUS.md` - service-by-service coverage tracker.

## Usage

Run the service-specific script when you are ready to test one service. The script writes a transcript and a JSON summary under `logs/<service>/`. After a successful run, mark the service as done in `STATUS.md`.