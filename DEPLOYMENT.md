# GitHub Pages Deployment Guide

## Setup Instructions

### 1. Update Repository Information
In `package.json`, replace the homepage URL:
```json
"homepage": "https://YOUR_GITHUB_USERNAME.github.io/Project_Nexus"
```
Change `YOUR_GITHUB_USERNAME` to your actual GitHub username.

### 2. GitHub Repository Settings
1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions**

### 3. Deploy Options

#### Option A: Automatic Deployment (Recommended)
Push your code to the `main` branch:
```bash
git add .
git commit -m "Configure GitHub Pages deployment"
git push origin main
```
The GitHub Action will automatically build and deploy your site.

#### Option B: Manual Deployment
Run the deployment script:
```bash
npm run deploy
```

### 4. Access Your Site
After deployment, your site will be available at:
```
https://YOUR_GITHUB_USERNAME.github.io/Project_Nexus
```

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
