# 🚀 Project Nexus - Deployment Guide

> **Status: 100% COMPLETED** - All development, integration, and testing phases are finished.


This guide covers multiple deployment options for Project Nexus.

---

## 📋 Table of Contents
1. [Docker Deployment (Recommended)](#-docker-deployment-recommended)
2. [GitHub Pages Deployment](#-github-pages-deployment)
3. [Manual Deployment](#-manual-deployment)

---

## 🐳 Docker Deployment (Recommended)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed
- Docker Compose (included with Docker Desktop)

### Quick Start

```bash
# Navigate to project directory
cd "f:\BS IT\Project_Nexus"

# Start with Docker Compose
docker-compose -f docker/docker-compose.yml up -d

# Access application
# Open browser: http://localhost:3000
```

### Docker Commands

| Command | Description |
|---------|-------------|
| `docker-compose -f docker/docker-compose.yml up -d` | Start containers in background |
| `docker-compose -f docker/docker-compose.yml down` | Stop and remove containers |
| `docker-compose -f docker/docker-compose.yml logs -f` | View container logs |
| `docker-compose -f docker/docker-compose.yml build` | Rebuild images |
| `docker-compose -f docker/docker-compose.yml ps` | List running containers |

### Configuration

**Port Configuration** (in `docker/docker-compose.yml`):
```yaml
services:
  frontend:
    ports:
      - "3000:80"  # Change 3000 to any available port
```

### Troubleshooting

**Port Already in Use:**
```bash
# Check what's using the port
netstat -ano | findstr :3000

# Change port in docker-compose.yml
ports:
  - "3001:80"  # Use different port
```

**Container Won't Start:**
```bash
# View logs
docker logs project-nexus-frontend

# Restart container
docker-compose -f docker/docker-compose.yml restart
```

**Clean Rebuild:**
```bash
# Remove everything and rebuild
docker-compose -f docker/docker-compose.yml down -v
docker system prune -a
docker-compose -f docker/docker-compose.yml build --no-cache
docker-compose -f docker/docker-compose.yml up -d
```

📖 **For detailed Docker documentation**, see [docker/README.md](docker/README.md)

---

## 🌐 GitHub Pages Deployment

## Setup Instructions

### 1. Update Repository Information
In `package.json`, replace the homepage URL:
```json
"homepage": "https://YOUR_GITHUB_USERNAME.github.io/Project_Nexus"
```
Change `YOUR_GITHUB_USERNAME` to your actual GitHub username.

### 2. GitHub Repository Settings - IMPORTANT!

#### Step-by-Step GitHub Pages Configuration:

1. **Go to your GitHub repository** (https://github.com/YOUR_USERNAME/Project_Nexus)

2. **Click on "Settings"** tab (top menu)

3. **In the left sidebar, scroll down and click "Pages"**

4. **Under "Build and deployment" section:**
   - **Source**: Select **"GitHub Actions"** from the dropdown
     - ❌ NOT "Deploy from a branch" 
     - ✅ SELECT "GitHub Actions"
   
5. **Save** (if there's a save button, otherwise it auto-saves)

6. **The workflow will trigger on push to `Asad_node` branch**

### 3. Deploy Options

#### Option A: Automatic Deployment (Recommended)
Push your code to the `Asad_node` branch:
```bash
git add .
git commit -m "Configure GitHub Pages deployment"
git push origin Asad_node
```
The GitHub Action will automatically build and deploy your site.

#### Option B: Manual Deployment
Run the deployment script:
```bash
npm run deploy
```
**Note:** Manual deployment creates a `gh-pages` branch. If using GitHub Actions, you don't need this.

### 4. Access Your Site
After deployment, your site will be available at:
```
https://YOUR_GITHUB_USERNAME.github.io/Project_Nexus
```

### 5. Check Deployment Status

1. Go to **Actions** tab in your repository
2. You'll see "Deploy to GitHub Pages" workflow
3. Click on the latest run to see progress
4. Wait for the green checkmark ✅
5. Your site will be live in 2-5 minutes

## Current Configuration

- **Deployment Branch**: `Asad_node`
- **Build Command**: `npm run build`
- **Output Directory**: `dist/`
- **Base Path**: `/Project_Nexus/`

## Important Notes

- **Base Path**: The `base` property in `vite.config.js` is set to `/Project_Nexus/`. This must match your repository name.
- **Build Folder**: Vite builds to the `dist` folder by default.
- **First Deployment**: Initial deployment may take 2-5 minutes.

## Troubleshooting

### 404 Errors
- Verify the `base` path in `vite.config.js` matches your repository name
- Check that GitHub Pages is enabled in repository settings

### Build Fails
- Run `npm run build` locally to check for errors
- Ensure all dependencies are installed: `npm install`

### Assets Not Loading
- Confirm the `homepage` in `package.json` is correct
- Check browser console for CORS or path errors

## Development vs Production

| Environment | Command | URL | Purpose |
|-------------|---------|-----|---------|
| **Development** | `npm run dev` | http://localhost:5173 | Hot reload for development |
| **Docker (Local)** | `docker-compose up -d` | http://localhost:3000 | Production-like environment |
| **Preview Build** | `npm run preview` | http://localhost:4173 | Test production build |
| **GitHub Pages** | `npm run deploy` | https://ASAD2204.github.io/PROJECT_NEXUS | Public deployment |

---

## 🐛 Common Issues

### Issue 1: Docker Build Fails
**Solution:**
```bash
# Clear npm cache and rebuild
npm cache clean --force
docker-compose -f docker/docker-compose.yml build --no-cache
```

### Issue 2: GitHub Pages 404 Errors
**Solution:**
- Verify `base` in `vite.config.js` matches repository name
- Check `homepage` in `package.json` is correct
- Ensure GitHub Pages is enabled in repository settings

### Issue 3: Assets Not Loading
**Solution:**
- Check browser console for path errors
- Verify base URL configuration
- Clear browser cache

---

## 📞 Support

For deployment issues, contact:
- **Muhammad Saad (BIT22034)** Muhammad Saad (BIT22034)
- **Muhammad Asad (BIT22031)** Muhammad Asad (BIT22031)
- **Email:** bit22031@pugc.edu.pk

---

**Last Updated:** January 27, 2026
