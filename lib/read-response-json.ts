/**
 * Parse a fetch Response as JSON. Empty or invalid bodies return null
 * (avoids "Unexpected end of JSON input" from response.json()).
 */
export async function readResponseJson<T>(r: Response): Promise<T | null> {
  const text = await r.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
