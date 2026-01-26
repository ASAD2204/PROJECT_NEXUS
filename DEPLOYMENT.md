# GitHub Pages Deployment Guide

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

- **Development**: `npm run dev` (runs on http://localhost:5173)
- **Build**: `npm run build` (creates production build in `dist/`)
- **Preview**: `npm run preview` (preview production build locally)
- **Deploy**: `npm run deploy` (deploy to GitHub Pages)
