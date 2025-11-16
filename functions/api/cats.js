/**
 * Cloudflare Pages Function to proxy TheCatAPI requests
 * This keeps the API key secure on the server-side
 *
 * Endpoint: /api/cats?limit=10
 */

export async function onRequest(context) {
  const { request, env } = context;

  // Only allow GET requests
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Get limit parameter from query string
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 100);

  // Validate limit
  if (isNaN(limit) || limit < 1) {
    return new Response(JSON.stringify({ error: 'Invalid limit parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
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
      throw new Error(`TheCatAPI returned ${response.status}`);
    }

    const cats = await response.json();

    // Return the cat images
    return new Response(JSON.stringify(cats), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'Access-Control-Allow-Origin': '*' // Allow CORS if needed
      }
    });

  } catch (error) {
    console.error('Error fetching from TheCatAPI:', error);

    return new Response(JSON.stringify({
      error: 'Failed to fetch cat images',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
