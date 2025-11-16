# Endless Cat Scroller

An endless scrolling web app that loads cat images from TheCatAPI.

## Local Development

### Prerequisites
- Node.js installed
- A TheCatAPI key (get one free at https://thecatapi.com/signup)

### Setup

1. **Get a free API key from TheCatAPI:**
   - Visit https://thecatapi.com/signup
   - Sign up with your email
   - Copy your API key

2. **Configure local environment:**
   - Edit `.dev.vars` file in the project root
   - Replace `your-api-key-here` with your actual API key:
     ```
     CAT_API_KEY=your-actual-api-key-here
     ```

3. **Install Wrangler (Cloudflare's CLI):**
   ```bash
   npm install -g wrangler
   ```

4. **Run the development server:**
   ```bash
   npx wrangler pages dev . --port 8788
   ```

5. **Open in browser:**
   ```
   http://localhost:8788
   ```

### Debugging

To see detailed logs on any deployment (local or production), add `?debug=1` to the URL:
```
http://localhost:8788/?debug=1
```

This will show a stats panel in the bottom-right corner with:
- Active images count
- Total loaded
- Cache hits
- API calls
- And more

## Cloudflare Pages Deployment

### Environment Variable Setup

**CRITICAL:** You must set the `CAT_API_KEY` environment variable in Cloudflare Pages:

1. Go to your Cloudflare Pages dashboard
2. Select your project
3. Go to **Settings** → **Environment variables**
4. Add a new variable:
   - **Variable name:** `CAT_API_KEY`
   - **Value:** Your TheCatAPI key
   - **Environment:** Production (and Preview if you want)
5. Click **Save**
6. **Redeploy** your site for the changes to take effect

### Verify Environment Variable

To check if your environment variable is set correctly:

1. Visit your deployed site with debug mode: `https://your-site.pages.dev/?debug=1`
2. Open browser console (F12)
3. Watch the API calls counter
4. If images load continuously without stopping at ~30-35 images, it's working!

Without the API key, TheCatAPI rate limits you to about 10 requests/minute, which causes the scroller to stop loading after 30-35 images.

## Troubleshooting

### Images stop loading at ~30-35 images

This is almost always caused by **rate limiting** from TheCatAPI. Solutions:

1. **Verify API key is set** in Cloudflare environment variables
2. **Redeploy** after adding the environment variable
3. **Check console** with `?debug=1` for specific error messages

### "Failed to fetch" errors

Check that:
- The Cloudflare Pages Function is deployed correctly
- CORS headers are working (should be fixed in latest code)
- Your API key is valid

### Testing without deploying

Use Wrangler locally:
```bash
npx wrangler pages dev . --port 8788
```

This simulates the Cloudflare Pages environment locally and uses your `.dev.vars` file for environment variables.

## How It Works

1. **Frontend** (`index.html`) uses Intersection Observer API to detect when user scrolls near the bottom
2. **API Proxy** (`functions/api/cats.js`) securely fetches images from TheCatAPI
3. **Caching** keeps a small buffer of images to reduce API calls
4. **Memory Management** removes off-screen images to prevent memory bloat

## Project Structure

```
.
├── index.html              # Main application
├── functions/
│   └── api/
│       └── cats.js         # Cloudflare Pages Function (API proxy)
├── .dev.vars              # Local environment variables (gitignored)
├── .gitignore
└── README.md
```
