// Serves pwnctual.com from the app on PythonAnywhere's free plan.
//
// PythonAnywhere only answers on YOURNAME.pythonanywhere.com, so this Worker
// sits on the real domain and forwards every request there. The browser only
// ever sees pwnctual.com: cookies, sign-in and links all stay on it.
// X-Pwnctual-Host tells the app the request came through here, so it doesn't
// redirect it back to the public URL.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const canonical = env.CANONICAL_HOST;
    if (url.protocol === "http:" || url.hostname !== canonical) {  // www. and http:// go to https://pwnctual.com
      url.protocol = "https:";
      url.hostname = canonical;
      return Response.redirect(url.toString(), 301);
    }

    const origin = new URL(env.ORIGIN);
    const target = new URL(url.pathname + url.search, origin);
    const headers = new Headers(request.headers);
    headers.set("X-Pwnctual-Host", canonical);
    headers.set("X-Forwarded-Proto", "https");
    const hasBody = !["GET", "HEAD"].includes(request.method);
    const resp = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,  // small form/JSON posts
      redirect: "manual",  // the browser follows redirects itself, on pwnctual.com
    });

    // A redirect that names the PythonAnywhere address is rewritten to the real domain.
    const location = resp.headers.get("Location");
    if (location && location.startsWith(origin.origin)) {
      const out = new Response(resp.body, resp);
      out.headers.set("Location", `https://${canonical}${location.slice(origin.origin.length)}`);
      return out;
    }
    return resp;
  },
};
