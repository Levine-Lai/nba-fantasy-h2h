import { jsonResponse } from "../../worker/src/lib/http.js";
import { buildPlayInGameDetailPayload, CACHE_CONTROL } from "./_lib/playin.js";

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
    const url = new URL(context.request.url);
    const gameId = url.searchParams.get("gameId") || url.searchParams.get("id");
    if (!gameId) {
      return jsonResponse(
        { success: false, error: "gameId is required" },
        400,
        { "cache-control": CACHE_CONTROL }
      );
    }

    return jsonResponse(
      await buildPlayInGameDetailPayload(gameId),
      200,
      { "cache-control": CACHE_CONTROL }
    );
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error: String(error?.message || error || "play-in game failed"),
      },
      500,
      { "cache-control": CACHE_CONTROL }
    );
  }
}
