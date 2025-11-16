# Deployment Guide

This guide explains how to deploy the Endless Cat Scroller to Cloudflare Pages with secure API key management.

## Architecture

The application uses a **Cloudflare Pages Function** to securely proxy requests to TheCatAPI. This keeps your API key hidden from client-side code.

```
User Browser → /api/cats (Cloudflare Pages Function) → TheCatAPI
                          ↑
                    API Key stored here
                    (environment variable)
```

## Deployment Steps

### 1. Push to GitHub

Make sure your code is pushed to GitHub:

```bash
git push origin main
```

### 2. Connect to Cloudflare Pages

1. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
2. Click **"Create a project"**
3. Connect your GitHub account
4. Select the `endlessmewscroller` repository
5. Configure the build settings:
   - **Build command**: (leave empty - static site)
   - **Build output directory**: `/` (root directory)
   - **Root directory**: `/`

### 3. Set Environment Variable

**IMPORTANT:** Before or after the first deployment, you need to add your API key:

1. In your Cloudflare Pages project, go to **Settings** → **Environment variables**
2. Add a new variable:
   - **Variable name**: `CAT_API_KEY`
   - **Value**: Your TheCatAPI key from the welcome email
   - **Environment**: Select both **Production** and **Preview**
3. Click **Save**

### 4. Deploy

1. Click **"Save and Deploy"**
2. Wait for the deployment to complete
3. Visit your site URL

### 5. Verify

Open your browser's Developer Console and check that:
- Images are loading
- The stats panel shows API calls being made
- No API key appears in the Network tab requests

## Local Development

For local development with the Cloudflare Pages Function:

### Option 1: Using Wrangler (Recommended)

```bash
# Install Wrangler
npm install -g wrangler

# Set environment variable locally
echo "CAT_API_KEY=your-api-key-here" > .dev.vars

# Run local dev server
wrangler pages dev .
```

The site will be available at `http://localhost:8788`

### Option 2: Mock API Endpoint

If you want to test without setting up Wrangler, you can temporarily modify `index.html`:

```javascript
const CONFIG = {
  // For local testing only - use direct API temporarily
  API_ENDPOINT: 'https://api.thecatapi.com/v1/images/search',
  // ...
}
```

**Remember to revert this before pushing to production!**

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `CAT_API_KEY` | Your TheCatAPI key from the welcome email | Yes |

## File Structure

```
endlessmewscroller/
├── index.html                 # Main application
├── functions/
│   └── api/
│       └── cats.js           # Cloudflare Pages Function (API proxy)
├── DEPLOYMENT.md             # This file
└── README.md                 # Project overview
```

## Troubleshooting

### "Failed to load cats" error

1. Check that `CAT_API_KEY` is set in Cloudflare Pages environment variables
2. Verify the API key is correct
3. Check the Functions logs in Cloudflare dashboard

### Local development not working

1. Make sure `.dev.vars` file exists with your API key
2. Ensure Wrangler is installed: `npm install -g wrangler`
3. Try running `wrangler pages dev . --compatibility-date=2024-01-01`

### Images load but only 10 at a time

This means the API key is not being sent. Check:
1. Environment variable is named exactly `CAT_API_KEY`
2. The variable is set for the correct environment (Production/Preview)
3. You've redeployed after adding the environment variable

## Security Notes

- ✅ API key is stored in Cloudflare environment variables (server-side)
- ✅ API key never appears in client-side code
- ✅ API key is not committed to Git
- ✅ Users cannot see or extract your API key

## Support

If you encounter issues:
1. Check Cloudflare Pages Functions logs
2. Verify environment variables are set correctly
3. Test the API endpoint directly: `https://yoursite.com/api/cats?limit=5`
