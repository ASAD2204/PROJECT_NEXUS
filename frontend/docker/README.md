# Docker Configuration for Project Nexus

This directory contains Docker configuration files for containerizing the Project Nexus application.

## 📁 Files

- **Dockerfile** - Frontend container configuration
- **docker-compose.yml** - Multi-container orchestration
- **.dockerignore** - Files to exclude from Docker build

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed ([Download here](https://www.docker.com/products/docker-desktop))
- Docker Compose (included with Docker Desktop)

### Option 1: Using Docker Compose (Recommended)

```bash
# Navigate to project root
cd "f:\BS IT\Project_Nexus"

# Build and start containers
docker-compose -f docker/docker-compose.yml up -d

# Access the application
# Open browser: http://localhost:3000
```

### Option 2: Using Dockerfile Directly

```bash
# Navigate to project root
cd "f:\BS IT\Project_Nexus"

# Build Docker image
docker build -t project-nexus-frontend -f docker/Dockerfile .

# Run container
docker run -d -p 3000:80 --name nexus-app project-nexus-frontend

# Access the application
# Open browser: http://localhost:3000
```

## 🛠️ Docker Commands

### Start Services
```bash
docker-compose -f docker/docker-compose.yml up -d
```

### Stop Services
```bash
docker-compose -f docker/docker-compose.yml down
```

### View Logs
```bash
docker-compose -f docker/docker-compose.yml logs -f frontend
```

### Rebuild Image
```bash
docker-compose -f docker/docker-compose.yml build --no-cache
docker-compose -f docker/docker-compose.yml up -d
```

### Remove Everything
```bash
docker-compose -f docker/docker-compose.yml down -v
docker rmi project-nexus-frontend
```

## 📋 Container Details

| Container | Port | Description |
|-----------|------|-------------|
| **frontend** | 3000:80 | React app served via Nginx |

## Backend Services

The docker-compose setup is expected to grow to include the backend stack used by Project Nexus:

- FastAPI API gateway and microservices
- PostgreSQL database
- Redis cache/session store
- MongoDB for document-style data
- Apache Kafka for event-driven workflows

Current frontend docker assets focus on serving the React application through Nginx, while the full stack is managed from the repository root deployment files.

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Change port in docker-compose.yml from 3000:80 to 3001:80
```

### Build Fails
```bash
# Clean Docker cache
docker system prune -a

# Rebuild from scratch
docker-compose -f docker/docker-compose.yml build --no-cache
```

### Container Won't Start
```bash
# Check logs
docker logs project-nexus-frontend

# Check if port is available
netstat -ano | findstr :3000
```

## 📝 Notes

- Frontend container uses multi-stage build for optimized image size
- Production build is served via Nginx
- Development environment should still use `npm run dev` for HMR
- Docker is primarily for production deployment and testing

---

**Last Updated:** 15 April 2026
