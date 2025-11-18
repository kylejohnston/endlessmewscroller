# CLAUDE.md - AI Assistant Guide for Endless Mew Scroller

This document provides AI assistants with comprehensive information about the Endless Mew Scroller codebase, architecture, development workflows, and conventions.

## Project Overview

**Endless Mew Scroller** is an infinite-scroll web application that displays cat images from TheCatAPI. Built with vanilla JavaScript, it features:

- Seamless infinite scrolling using Intersection Observer API
- Silent background image loading with no visible loading indicators
- Memory management to prevent bloat on long scrolling sessions
- Image caching to reduce API calls
- Secure API key management via Cloudflare Pages Functions
- Debug mode for development and troubleshooting

**Key Philosophy:** Simple, performant, vanilla JavaScript with no build tools or frameworks.

## Codebase Structure

```
endlessmewscroller/
├── index.html              # Main application (HTML + CSS + JavaScript)
├── functions/
│   └── api/
│       └── cats.js        # Cloudflare Pages Function (API proxy)
├── docs/
│   └── plans/
│       └── 2025-11-13-endless-cat-scroller-design.md
├── .dev.vars.example      # Template for local environment variables
├── .dev.vars              # Local environment variables (gitignored)
├── .gitignore
├── README.md              # User-facing documentation
├── DEPLOYMENT.md          # Deployment guide
└── LICENSE
```

### Key Files

- **index.html** (604 lines): Single-file application containing all HTML, CSS, and JavaScript
- **functions/api/cats.js** (103 lines): Server-side API proxy that securely handles TheCatAPI requests

## Architecture

### Component Overview

The application follows a modular architecture within a single file:

```
┌─────────────────────────────────────────────┐
│           User Browser (index.html)          │
├─────────────────────────────────────────────┤
│  1. Scroll Controller (Intersection Observer) │
│  2. Image Manager (State & DOM management)    │
│  3. CatAPI Service (Caching & fetching)       │
└──────────────────┬──────────────────────────┘
                   │ HTTP GET /api/cats?limit=N
                   ▼
┌─────────────────────────────────────────────┐
│   Cloudflare Pages Function (cats.js)       │
│   - Adds CAT_API_KEY header                 │
│   - Proxies requests to TheCatAPI           │
│   - Handles CORS and rate limiting          │
└──────────────────┬──────────────────────────┘
                   │ x-api-key: [secret]
                   ▼
┌─────────────────────────────────────────────┐
│         TheCatAPI (api.thecatapi.com)       │
└─────────────────────────────────────────────┘
```

### Code Organization (index.html)

JavaScript is organized into 7 sections (lines 223-601):

1. **Configuration & State** (224-253): CONFIG and STATE objects
2. **API Service** (256-385): CatAPI object with caching logic
3. **Image Manager** (387-475): Batch fetching and retry logic
4. **Memory Management** (477-504): Cleanup of off-screen images
5. **Scroll Controller** (506-524): Intersection Observer setup
6. **UI Utilities** (526-578): Error display and stats panel
7. **Initialization** (580-601): Application bootstrap

### Data Flow

```
User scrolls → Sentinel enters viewport (rootMargin: 200px)
  ↓
Intersection Observer triggers handleIntersection()
  ↓
fetchNextBatch() checks cache (20 images)
  ├─ Cache hit → Return cached images immediately
  └─ Cache miss → Fetch from /api/cats endpoint
      ↓
      Background cache refill triggered
  ↓
Filter out duplicates (STATE.loadedImageIds Set)
  ↓
Create DOM elements with fade-in animation
  ↓
Append to #image-container via DocumentFragment
  ↓
Cleanup old images if > 50 total (remove those > 2000px above viewport)
```

## Key Technical Decisions

### 1. Intersection Observer API

**Location:** index.html:515-524

```javascript
const observer = new IntersectionObserver(handleIntersection, {
  root: null,                        // Use viewport
  rootMargin: CONFIG.SCROLL_THRESHOLD, // '200px' - preload before visible
  threshold: 0
});
```

**Why:** Provides performant scroll detection without scroll event listeners. The 200px rootMargin ensures images load before user reaches the bottom.

### 2. Image Caching Strategy

**Location:** index.html:256-385 (CatAPI object)

- Maintains a cache of up to 20 images
- Serves from cache immediately (STATE.cacheHits++)
- Refills cache in background when below BATCH_SIZE (5)
- Prevents duplicate refills with `isRefilling` flag

**Why:** Reduces API calls, improves perceived performance, and stays within rate limits.

### 3. Memory Management

**Location:** index.html:478-504

- Triggers when > 50 images in DOM
- Removes images > 2000px above current scroll position
- Removes from both DOM and STATE.loadedImageIds Set

**Why:** Prevents memory bloat during long scrolling sessions while keeping enough images for smooth back-scrolling.

### 4. API Proxy Pattern

**Location:** functions/api/cats.js

- Client calls `/api/cats?limit=N`
- Server-side function adds `x-api-key` header
- API key stored in Cloudflare environment variables

**Why:** Keeps API key secure and hidden from client-side code. Prevents exposure in browser DevTools.

### 5. Initial Batch Size Calculation

**Location:** index.html:241-242

```javascript
const estimatedImagesPerViewport = Math.ceil(window.innerHeight / 400);
CONFIG.INITIAL_BATCH_SIZE = Math.max(estimatedImagesPerViewport * 2, 10);
```

**Why:** Adapts to different screen sizes, loading enough images to fill viewport plus buffer on initial load.

## State Management

### CONFIG Object (Immutable Configuration)

```javascript
CONFIG = {
  API_ENDPOINT: '/api/cats',
  BATCH_SIZE: 5,                  // Images per fetch after initial load
  SCROLL_THRESHOLD: '200px',      // Load trigger distance
  MAX_RETRIES: 3,
  RETRY_DELAYS: [2000, 4000, 8000],
  CLEANUP_THRESHOLD: 2000,         // px above viewport to cleanup
  CACHE_SIZE: 20,
  INITIAL_BATCH_SIZE: [calculated], // Based on viewport height
  DEV_MODE: [boolean]              // localhost, file://, or ?debug=1
}
```

### STATE Object (Mutable Application State)

```javascript
STATE = {
  loadedImageIds: Set(),  // Prevents duplicate images
  isLoading: false,       // Prevents concurrent fetches
  hasError: false,        // Stops fetching on critical errors
  isInitialLoad: true,    // Triggers larger initial batch
  totalLoaded: 0,         // Stats counter
  totalCleaned: 0,        // Stats counter
  cacheHits: 0,          // Stats counter
  apiCalls: 0            // Stats counter
}
```

### CatAPI Object State

```javascript
CatAPI = {
  cache: [],           // Array of cached image objects
  isRefilling: false   // Prevents duplicate cache refills
}
```

## Development Workflow

### Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/kylejohnston/endlessmewscroller.git
cd endlessmewscroller

# 2. Get TheCatAPI key from https://thecatapi.com/signup

# 3. Create .dev.vars file
cp .dev.vars.example .dev.vars
# Edit .dev.vars and add your API key

# 4. Install Wrangler globally
npm install -g wrangler

# 5. Run development server
npx wrangler pages dev . --port 8788

# 6. Open browser
open http://localhost:8788
```

### Debug Mode

Access debug mode by:
- Running on localhost/127.0.0.1
- Opening via file:// protocol
- Adding `?debug=1` to any URL

**Features:**
- Stats panel in bottom-right corner
- Console logging for all CatAPI operations
- Displays: Active images, Total loaded, Cleaned count, Cache hits, API calls, Cached images

**Location:** Check `CONFIG.DEV_MODE` at index.html:235-238

### Testing Locally

```bash
# Test with debug mode
open http://localhost:8788/?debug=1

# Check console for:
# - "[CatAPI] Fetching N images from API"
# - "[CatAPI] Served N images from cache"
# - "[fetchNextBatch] Added N new images"
```

## Deployment Workflow

### Cloudflare Pages Deployment

1. Push code to GitHub main branch
2. Connect repository to Cloudflare Pages
3. Configure build settings:
   - Build command: (empty)
   - Build output directory: `/`
   - Root directory: `/`
4. Add environment variable:
   - Name: `CAT_API_KEY`
   - Value: Your TheCatAPI key
   - Environment: Production + Preview
5. Deploy and verify

### Critical Deployment Notes

- **MUST** set `CAT_API_KEY` in Cloudflare Pages environment variables
- **MUST** redeploy after adding environment variable
- Without API key: Rate limited to ~10 requests/minute (stops at 30-35 images)
- With API key: No rate limits (unlimited scrolling)

### Verify Deployment

```
https://your-site.pages.dev/?debug=1
```

Check:
- Images load continuously (no stopping at 30-35)
- API calls increment in stats panel
- No API key visible in Network tab
- Console shows successful fetches

## Code Conventions

### Naming Conventions

- **Constants:** UPPER_SNAKE_CASE (CONFIG, STATE)
- **Functions:** camelCase (fetchNextBatch, handleIntersection)
- **Classes/Objects:** PascalCase (CatAPI) or camelCase for instances
- **Private methods:** Prefixed with `_` (CatAPI._fetchFromAPI)

### Code Style

- **Comments:** Section headers use `// ===== SECTION =====`
- **Logging:** Conditional on `CONFIG.DEV_MODE`
- **Error handling:** Try/catch with console.error, silent failures for images
- **Async/await:** Preferred over promises for readability

### DOM Patterns

```javascript
// Build elements
const wrapper = document.createElement('div');
wrapper.className = 'image-wrapper';

// Batch inserts with DocumentFragment
const fragment = document.createDocumentFragment();
newImages.forEach(imageData => {
  fragment.appendChild(element);
});
container.appendChild(fragment);

// Use data attributes for IDs
wrapper.dataset.imageId = imageData.id;
```

### CSS Patterns

- **Layout:** Flexbox for vertical stacking
- **Animations:** CSS transitions, JavaScript adds classes
- **Responsive:** max-width on container, percentage-based widths
- **Loading states:** Opacity transitions (.image-wrapper.loaded)

## Error Handling

### Three Error Categories

1. **Network Errors** (index.html:458-475)
   - Exponential backoff retry (2s, 4s, 8s)
   - Max 3 retries
   - No retry on rate limits (429)

2. **API Errors** (functions/api/cats.js:59-78)
   - Rate limiting (429): Return specific message with Retry-After header
   - Server errors (5xx): Generic error message
   - All errors include CORS headers

3. **Image Load Failures** (index.html:370-373)
   - Remove failed image from DOM
   - Log to console in dev mode
   - Silent failure (no user notification)

### Error States

- `STATE.hasError = true`: Stops all future fetching
- `STATE.isLoading`: Prevents concurrent requests
- Rate limit errors: Display user-friendly message with timeout info

## Security Considerations

### API Key Management

- **Never** commit `.dev.vars` to git (in .gitignore)
- **Never** expose CAT_API_KEY in client-side code
- **Always** use Cloudflare Pages Function as proxy
- Client only sees `/api/cats` endpoint

### CORS Configuration

```javascript
// functions/api/cats.js:9-14
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',  // Public API, no credentials
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};
```

### Input Validation

```javascript
// functions/api/cats.js:37
const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 100);
```

Prevents abuse by capping limit at 100.

## Performance Considerations

### Optimization Techniques

1. **Native Lazy Loading:** `<img loading="lazy">` (index.html:364)
2. **Intersection Observer:** Browser-native, highly performant
3. **DocumentFragment:** Minimizes DOM reflows during batch inserts
4. **Image Cleanup:** Removes off-screen images after 50 total
5. **Cache Strategy:** Reduces API calls by 80%+ on typical usage

### Performance Metrics (Debug Mode)

Track these in stats panel:
- Cache hit ratio (cacheHits / totalLoaded)
- API call frequency (should be ~1 per 4 images loaded with cache)
- Active images (should stabilize around 50-70 during long sessions)

## AI Assistant Guidelines

### Before Making Changes

1. **Read the design document:** docs/plans/2025-11-13-endless-cat-scroller-design.md
2. **Test locally first:** Use wrangler pages dev
3. **Enable debug mode:** Add ?debug=1 to URL
4. **Check existing patterns:** Match coding style and conventions

### Making Code Changes

#### To index.html

- **Preserve section organization** (7 sections with comment headers)
- **Maintain single-file architecture** (no external JS/CSS files)
- **Test with debug mode enabled**
- **Update DEV_MODE stats panel** if adding new metrics
- **Consider mobile viewports** (responsive design)

Example adding a feature:
```javascript
// Add config in section 1
CONFIG.NEW_FEATURE_ENABLED = true;

// Add state in section 1
STATE.newFeatureData = [];

// Add logic in appropriate section (2-7)
function newFeatureFunction() {
  // Implementation
}
```

#### To functions/api/cats.js

- **Maintain CORS headers** on all responses
- **Preserve error handling patterns** (429 rate limits, 5xx errors)
- **Keep API key security** (never log env.CAT_API_KEY)
- **Test preflight requests** (OPTIONS method)

### Common Tasks

#### Add a new stat to debug panel

1. Add state variable in STATE object (line 244-253)
2. Increment in appropriate function
3. Update updateStats() function (line 557-578)

#### Change batch size

Modify CONFIG.BATCH_SIZE (line 228) and CONFIG.CACHE_SIZE (line 233).
Recommended ratio: CACHE_SIZE = BATCH_SIZE * 4

#### Adjust cleanup behavior

Modify CONFIG.CLEANUP_THRESHOLD (line 232) or cleanup trigger count in cleanupOldImages() (line 482).

#### Add new API parameter

1. Update functions/api/cats.js query string parsing
2. Update CatAPI._fetchFromTheCatAPI() call
3. Test with debug mode to verify parameter passes through

### Testing Checklist

When making changes, verify:

- [ ] Works on localhost:8788 with wrangler
- [ ] Debug mode displays correct stats
- [ ] Images load continuously without stopping
- [ ] No console errors in production mode
- [ ] Memory cleanup activates after 50 images
- [ ] Cache refills properly (check console logs)
- [ ] Mobile responsive (test at 375px width)
- [ ] Rate limit handling works (test without API key)
- [ ] Error states display properly
- [ ] Animations smooth (opacity transitions)

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/description

# Make changes and test locally
npx wrangler pages dev . --port 8788

# Commit with descriptive message
git add .
git commit -m "feat: add new feature description"

# Push and create PR
git push origin feature/description
```

### Commit Message Convention

Format: `type: description`

Types:
- `feat`: New feature
- `fix`: Bug fix
- `style`: CSS/visual changes
- `refactor`: Code restructuring
- `docs`: Documentation only
- `perf`: Performance improvement

Examples:
- `feat: add image favoriting functionality`
- `fix: prevent duplicate images in cache`
- `style: update header gradient colors`
- `perf: optimize cleanup threshold to reduce reflows`

## Troubleshooting

### Common Issues

**Images stop at 30-35**
- Cause: Missing CAT_API_KEY environment variable
- Solution: Set in Cloudflare Pages and redeploy

**"Failed to fetch" errors**
- Cause: CORS or network issues
- Solution: Check functions/api/cats.js CORS headers, verify API key

**Wrangler dev not working**
- Cause: Missing .dev.vars file
- Solution: Copy .dev.vars.example to .dev.vars and add key

**Memory usage increases**
- Cause: Cleanup not activating
- Solution: Check cleanupOldImages() logic, verify > 50 images trigger

**Cache not refilling**
- Cause: isRefilling flag stuck or error in refill
- Solution: Check console for "Cache refill failed" messages

### Debug Console Commands

When debug mode is active:

```javascript
// Check state
console.log(STATE);

// Check cache
console.log(CatAPI.cache.length);

// Check loaded IDs
console.log(STATE.loadedImageIds.size);

// Force cleanup
cleanupOldImages();

// Check active images
document.querySelectorAll('.image-wrapper').length
```

## API Reference

### TheCatAPI Integration

**Endpoint:** `https://api.thecatapi.com/v1/images/search`

**Parameters:**
- `limit`: Number of images (1-100)
- `x-api-key`: API key (header, required for unlimited access)

**Response:**
```json
[
  {
    "id": "abc123",
    "url": "https://cdn2.thecatapi.com/images/abc123.jpg",
    "width": 1200,
    "height": 800
  }
]
```

**Rate Limits:**
- Without key: ~10 requests/minute
- With key: No limits

### Internal API Endpoint

**Endpoint:** `/api/cats`

**Method:** GET

**Query Parameters:**
- `limit`: Number of images (default: 10, max: 100)

**Response:** Same as TheCatAPI (proxied)

**Headers:**
- All responses include CORS headers
- Cache-Control: no-cache (ensures fresh images)

## Additional Resources

- **Project README:** README.md - User-facing documentation
- **Deployment Guide:** DEPLOYMENT.md - Detailed deployment instructions
- **Design Document:** docs/plans/2025-11-13-endless-cat-scroller-design.md
- **TheCatAPI Docs:** https://developers.thecatapi.com/
- **Cloudflare Pages:** https://pages.cloudflare.com/
- **Intersection Observer API:** https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API

## Version History

- **v2 (Current):** Added caching, memory management, debug mode
- **v1:** Initial release with basic infinite scroll

## Contact

- **Repository:** https://github.com/kylejohnston/endlessmewscroller
- **Issues:** Use GitHub Issues for bug reports and feature requests
- **Author:** Kyle Johnston

---

*Last Updated: 2025-11-18*
*Document Version: 1.0*
