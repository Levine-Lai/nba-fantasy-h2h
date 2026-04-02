export async function onRequest(context) {
  const auth = context.env?.REFRESH_TOKEN;
  if (auth) {
    const url = new URL(context.request.url);
    const token = url.searchParams.get("token");
    if (token !== auth) {
      return new Response("Not found", { status: 404 });
    }
  }

  return context.next();
}
