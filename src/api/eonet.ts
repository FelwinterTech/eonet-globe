const BASE_URL = 'https://eonet.gsfc.nasa.gov/api/v3';

export async function fetchEvents(params: { status?: 'open' | 'closed', category?: string, limit?: number, days?: number }) {
  const url = new URL(`${BASE_URL}/events`);
  Object.entries(params).forEach(([key, value]) => value && url.searchParams.set(key, String(value)));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`EONET request failed: ${res.status}`);
  return res.json();
}

export async function fetchCategories() {
  const res = await fetch(`${BASE_URL}/categories`);
  if (!res.ok) throw new Error(`EONET request failed: ${res.status}`);
  return res.json();
}
