// Shared HTTP utilities for upstream NBA Fantasy and public JSON responses.
const BASE_URL = "https://nbafantasy.nba.com/api";

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type,authorization",
    },
  });
}

export async function fetchJson(path, retries = 3) {
  let lastError = null;
  for (let i = 0; i <= retries; i += 1) {
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        headers: { "user-agent": "Mozilla/5.0" },
      });
      if (!res.ok) throw new Error(`fetch failed ${path}: ${res.status}`);
      return res.json();
    } catch (error) {
      lastError = error;
      if (i < retries) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (i + 1)));
      }
    }
  }
  throw lastError || new Error(`fetch failed ${path}`);
}

export async function fetchJsonSafe(path, retries = 3) {
  try {
    const data = await fetchJson(path, retries);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, data: null, error: String(error?.message || error || "fetch failed") };
  }
}

export async function fetchTextUrl(url, retries = 2) {
  let lastError = null;
  for (let i = 0; i <= retries; i += 1) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": "Mozilla/5.0" },
      });
      if (!res.ok) throw new Error(`fetch failed ${url}: ${res.status}`);
      return await res.text();
    } catch (error) {
      lastError = error;
      if (i < retries) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (i + 1)));
      }
    }
  }
  throw lastError || new Error(`fetch failed ${url}`);
}

export async function fetchJsonUrl(url, retries = 2) {
  let lastError = null;
  for (let i = 0; i <= retries; i += 1) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": "Mozilla/5.0" },
      });
      if (!res.ok) throw new Error(`fetch failed ${url}: ${res.status}`);
      return await res.json();
    } catch (error) {
      lastError = error;
      if (i < retries) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (i + 1)));
      }
    }
  }
  throw lastError || new Error(`fetch failed ${url}`);
}
