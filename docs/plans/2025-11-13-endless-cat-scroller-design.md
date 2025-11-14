# Endless Cat Scroller - Design Document

**Date:** 2025-11-13
**Status:** Approved

## Overview

An endless vertical scrolling interface for cat images using vanilla JavaScript. Images load automatically from an API as the user scrolls, with no visible loading indicators (silent loading). Built with modern browser APIs for performance.

## Requirements

- Vertical infinite scroll of cat images from an API
- Load new images when user scrolls near bottom (~200px before end)
- Silent loading with no visible indicators
- Vanilla JavaScript (no frameworks or build tools)
- Generic API interface to allow swapping providers
- Smooth visual transitions for new images

## Architecture

### Core Components

**1. API Service**
- Handles fetching cat images from external API
- Returns promises with image data (URL, dimensions, ID)
- Abstracted interface allows easy API provider swapping
- Generic function: `fetchCatImages(count)` returns array of image objects

**2. Image Manager**
- Manages state of loaded images
- Tracks loaded images to prevent duplicates
- Handles batch fetching (5 images at a time)
- Creates DOM elements and appends to container
- State tracked: `loadedImages` array, `isLoading` boolean, `hasError` boolean

**3. Scroll Controller**
- Uses Intersection Observer API to watch sentinel element
- Triggers batch loads when sentinel enters viewport
- Manages observer lifecycle

### Data Flow

```
User scrolls down
  → Sentinel enters viewport
  → Intersection Observer fires callback
  → Scroll Controller requests batch from Image Manager
  → Image Manager calls API Service
  → API Service fetches from external API
  → Images returned to Image Manager
  → Image Manager creates DOM elements and appends to container
  → Sentinel remains at bottom, ready for next trigger
```

## DOM Structure

```html
<body>
  <div id="image-container">
    <!-- Cat images dynamically inserted here -->
  </div>
  <div id="sentinel"></div> <!-- Invisible 1px trigger element -->
</body>
```

### Image Element Structure

```html
<div class="image-wrapper">
  <img src="cat-url.jpg" alt="A cat" loading="lazy">
</div>
```

Each image uses:
- Container div for aspect ratio and layout control
- Native `loading="lazy"` attribute for browser-level lazy loading
- CSS transitions for fade-in effect

### Sentinel Element

- 1px tall, invisible (`opacity: 0`)
- Always positioned at bottom of image container
- Observed by Intersection Observer
- Triggers fetch when within 200px of viewport

## Intersection Observer Implementation

### Configuration

```javascript
const observer = new IntersectionObserver(
  handleIntersection,
  {
    root: null,              // viewport is the root
    rootMargin: '200px',     // trigger 200px before visible
    threshold: 0             // fire as soon as any part enters
  }
);
```

**Key setting:** `rootMargin: '200px'` triggers fetch before user reaches bottom, creating seamless endless scroll experience.

### Callback Logic

```
handleIntersection() called
  → Check isLoading flag (return early if true)
  → Set isLoading = true
  → Call fetchNextBatch()
  → fetchNextBatch() gets 5 images from API
  → Create and append image elements
  → Set isLoading = false
  → Sentinel remains observed at bottom
```

### Race Condition Prevention

`isLoading` flag ensures only one fetch occurs at a time. Prevents:
- Duplicate requests from rapid scrolling
- Race conditions with slow API responses
- Unnecessary API calls

## API Integration

### Interface Design

Generic interface works with any cat image API:

```javascript
async function fetchCatImages(count = 5) {
  // Returns: [{ url: '...', id: '...', width: x, height: y }, ...]
}
```

Single function contains all API-specific logic. Swapping providers requires changing only this function.

### Error Handling (Silent Loading)

**Network Failures:**
- Catch fetch errors
- Automatic retry with exponential backoff (2s, 4s, 8s)
- Maximum 3 retry attempts
- No user-visible indicators

**API Errors:**
- Rate limiting or service errors stop fetching
- Set `hasError = true` to prevent further attempts
- Errors logged to console only

**Individual Image Load Failures:**
- Images that fail to load are silently removed from DOM
- No error messages or broken image icons

### Rate Limiting Strategy

Respectful API usage:
- Small batch sizes (5 images per fetch)
- Fetch only when sentinel visible (no pre-emptive loading)
- Stop fetching if `hasError = true`
- Exponential backoff on failures

## Performance

### Optimizations

1. **Native Lazy Loading:** `loading="lazy"` on all images - browser handles optimization
2. **Batch DOM Updates:** Use `DocumentFragment` when appending multiple images to minimize reflows
3. **Intersection Observer:** Browser-native API, highly performant
4. **Memory Management (v1):** Allow all images to remain in DOM for simplicity

**Future consideration:** If hundreds of images cause performance issues, implement removal of images far above viewport.

### Visual Transitions

Smooth fade-in for new images:

```css
.image-wrapper {
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image-wrapper.loaded {
  opacity: 1;
}
```

Add `.loaded` class when image fires `onload` event.

## Initial Load Sequence

1. Page loads with empty container and sentinel in place
2. JavaScript immediately triggers initial fetch (before user scrolls)
3. First batch (5-10 images) loads and populates viewport
4. Intersection Observer starts watching sentinel
5. User scrolls, triggering subsequent batches

## File Structure

Single file architecture - all code in `index.html`:

- **HTML:** Container and sentinel elements
- **CSS:** Inline `<style>` tag with layout and transitions
- **JavaScript:** Inline `<script>` tag at bottom of `<body>`

No external files, no build process, no dependencies.

### JavaScript Code Organization

```javascript
// 1. Configuration & State
// 2. API Service functions
// 3. Image Manager functions
// 4. Scroll Controller & Observer setup
// 5. Initialization code
```

Comments separate sections for easy navigation and maintenance.

## Success Criteria

- Smooth endless scrolling with no perceived "loading" delays
- Images load automatically as user approaches bottom
- No visible spinners, placeholders, or error messages
- Works in modern browsers (Chrome, Firefox, Safari, Edge)
- Clean, maintainable vanilla JavaScript
- Easy to swap API providers

## Future Enhancements (Out of Scope for v1)

- Virtual scrolling for extreme performance
- Remove off-screen images above viewport
- Image caching/persistence
- User preferences or filtering
- Framework migration (React/Vue)
