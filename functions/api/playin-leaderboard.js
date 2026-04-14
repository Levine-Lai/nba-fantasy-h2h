import { jsonResponse } from "../../worker/src/lib/http.js";
import { buildPlayInLeaderboardPayload, CACHE_CONTROL } from "./_lib/playin.js";

export async function onRequest(context) {
  if (context.request.method === "OPTIONS") {
    return jsonResponse({ ok: true }, 200, { "cache-control": CACHE_CONTROL });
  }

  if (context.request.method !== "GET") {
    return jsonResponse(
      { success: false, error: "method not allowed" },
      405,
      { "cache-control": CACHE_CONTROL }
    );
  }

  try {
    return jsonResponse(
      await buildPlayInLeaderboardPayload(),
      200,
      { "cache-control": CACHE_CONTROL }
    );
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error: String(error?.message || error || "play-in leaderboard failed"),
      },
      500,
      { "cache-control": CACHE_CONTROL }
    );
  }
}
