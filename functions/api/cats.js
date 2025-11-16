/**
 * Cloudflare Pages Function to proxy TheCatAPI requests
 * This keeps the API key secure on the server-side
 *
 * Endpoint: /api/cats?limit=10
 */

// Common CORS headers for all responses
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export async function onRequest(context) {
  const { request, env } = context;

  // Handle OPTIONS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS
    });
  }

  // Only allow GET requests
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: CORS_HEADERS
    });
  }

  // Get limit parameter from query string
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 100);

  // Validate limit
  if (isNaN(limit) || limit < 1) {
    return new Response(JSON.stringify({ error: 'Invalid limit parameter' }), {
      status: 400,
      headers: CORS_HEADERS
    });
  }

  try {
    // Fetch from TheCatAPI with the secret API key
    const apiUrl = `https://api.thecatapi.com/v1/images/search?limit=${limit}`;
    const headers = {};

    // Add API key from environment variable if available
    if (env.CAT_API_KEY) {
      headers['x-api-key'] = env.CAT_API_KEY;
    }

    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`TheCatAPI error ${response.status}:`, errorText);

      // Handle rate limiting specifically
      if (response.status === 429) {
        return new Response(JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Too many requests to TheCatAPI. Please try again later.'
        }), {
          status: 429,
          headers: {
            ...CORS_HEADERS,
            'Retry-After': response.headers.get('Retry-After') || '60'
          }
        });
      }

      throw new Error(`TheCatAPI returned ${response.status}: ${errorText}`);
    }

    const cats = await response.json();

    // Return the cat images (no caching to ensure fresh images each time)
    return new Response(JSON.stringify(cats), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error('Error fetching from TheCatAPI:', error);

    return new Response(JSON.stringify({
      error: 'Failed to fetch cat images',
      message: error.message
    }), {
      status: 500,
      headers: CORS_HEADERS
    });
  }
}
