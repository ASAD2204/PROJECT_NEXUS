# Deployment Playbook

> **Status: 100% COMPLETED** - All development, integration, and testing phases are finished.


This folder collects the deployment paths for Project Nexus in one place.
Use it when you want the whole stack deployed on a single laptop, multiple laptops,
Oracle Always Free, or Azure Student credits.

## What This Folder Covers

- Single laptop deployment with Docker Swarm
- Oracle Always Free VM deployment
- Azure Student VM deployment
- Multiple laptop Swarm deployment
- Helper scripts for environment prep, image builds, export/import, and stack startup

## Recommended Path

For the current repository, the practical deployment model is:

- Docker Swarm on one machine for single-laptop, Oracle, or Azure VM deployment
- Docker Swarm cluster for multiple laptops
- The frontend is served through the same stack and talks to the API gateway at `/api/v1`

## Folder Layout

```text
deployment/
├── README.md
├── stack.single-node.yml
└── scripts/
    ├── build-images.ps1
    ├── export-images.ps1
    ├── import-images.ps1
    ├── join-worker.ps1
    ├── prepare-env.ps1
    ├── start-single-node.ps1
    └── stop-stack.ps1
```

## Common Requirements

- Docker Engine or Docker Desktop
- Git
- A copy of `.env` at the repository root
- Enough RAM for the chosen deployment mode

## Environment Variables

Start from the root template:

- [`.env.example`](../.env.example)

At minimum, set:

- `JWT_SECRET`
- `GEMINI_API_KEY` or `GEMINI_API_KEYS` if you use AI features
- `GROQ_API_KEYS` if you use Groq for the AI service
- `STRIPE_SECRET_KEY` if you want finance payment flows to work

## Deployment Modes

### 1. Single Laptop

Use this when you want everything running locally on one machine.

Steps:

1. Install Docker.
2. Clone the repository.
3. Run `deployment/scripts/start-single-node.ps1`.
4. Open the frontend in your browser.

This mode is best for development, demos, and offline testing.

### 2. Oracle Always Free VM

Use this when you want a free public cloud deployment.

Steps:

1. Create an Oracle Always Free Ubuntu VM.
2. Open ports `80`, `443`, and optionally `8081`.
3. Install Docker.
4. Clone the repository.
5. Run `deployment/scripts/start-single-node.ps1`.

This is the best no-cost option for a full working stack.

### 3. Azure Student VM

Use this when you want to spend Azure student credits.

Steps:

1. Create a Linux VM in Azure.
2. Open ports `80`, `443`, and optionally `8081`.
3. Install Docker.
4. Clone the repository.
5. Run `deployment/scripts/start-single-node.ps1`.

This is the easiest way to use your credits without redesigning the stack.

### 4. Multiple Laptops

Use this for a lab or class demo where one laptop is the Swarm manager and the others are workers.

Recommended flow:

1. Build images on the manager with `deployment/scripts/build-images.ps1`.
2. Export the images with `deployment/scripts/export-images.ps1`.
3. Copy the exported archive to each worker laptop.
4. Load the archive on each worker with `deployment/scripts/import-images.ps1`.
5. Initialize Swarm on the manager and deploy the stack.
6. Join workers with `deployment/scripts/join-worker.ps1`.

If you want a registry-based cluster instead, you can adapt the same image tags to a private registry later.

## Scripts

### `prepare-env.ps1`

Creates `.env` from `.env.example` if it does not exist.

### `build-images.ps1`

Builds the local Docker images used by the stack.

### `export-images.ps1`

Saves all built `nexus/*:latest` images into one tarball for transport.

### `import-images.ps1`

Loads a previously exported tarball into another laptop or VM.

### `start-single-node.ps1`

Initializes Swarm if needed, builds the images, and deploys the stack with the
single-node override.

### `join-worker.ps1`

Joins a laptop to the Swarm cluster as a worker.

### `stop-stack.ps1`

Removes the stack and optionally leaves Swarm.

## Single-Node Override

The file [stack.single-node.yml](stack.single-node.yml) reduces resource use by:

- Publishing the frontend on port `80`
- Publishing the API gateway on port `8081`
- Scaling observability and backup services down to `0`
- Keeping the main application services active

## Quick Start

On a single laptop, Oracle VM, or Azure VM:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
.\deployment\scripts\start-single-node.ps1
```

If you only want to prepare the environment file first:

```powershell
.\deployment\scripts\prepare-env.ps1
```

## Post-Deploy Checks

- Frontend: `http://localhost` or `http://YOUR_VM_IP`
- API health: `http://YOUR_VM_IP:8081/health`
- Redis: internal to the stack
- PostgreSQL: internal to the stack
- MongoDB: internal to the stack

## Notes

- The root stack is Swarm-based.
- The helper scripts are written in PowerShell because the workspace is on Windows.
- If you deploy on Linux, the same commands can be translated to Bash easily.