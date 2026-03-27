import worker from "../../worker/src/index.js";

export async function onRequest(context) {
  try {
    return await worker.fetch(context.request, context.env, context);
  } catch (error) {
    const message = String(error?.message || error || "Unknown Pages Function error");
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
        source: "pages-function",
      }),
      {
        status: 500,
        headers: {
          "content-type": "application/json; charset=UTF-8",
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,POST,OPTIONS",
          "access-control-allow-headers": "Content-Type",
        },
      }
    );
  }
}
