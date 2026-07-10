const STATE_KEY = "shared-state";

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-Sync-Token"
  };
}

function jsonResponse(status, payload, origin) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin)
    }
  });
}

function unauthorized(origin) {
  return jsonResponse(401, { error: "Unauthorized" }, origin);
}

function isAuthorized(request, env) {
  const expected = String(env.SYNC_TOKEN || "").trim();
  if (!expected) return true;
  const provided = String(request.headers.get("X-Sync-Token") || "").trim();
  return provided && provided === expected;
}

async function handleGet(env, origin) {
  const raw = await env.STATE_KV.get(STATE_KEY);
  if (!raw) {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders(origin)
      }
    });
  }

  return new Response(raw, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin)
    }
  });
}

async function handlePut(request, env, origin) {
  const rawBody = await request.text();
  if (!rawBody) {
    return jsonResponse(400, { error: "Body is required." }, origin);
  }

  try {
    JSON.parse(rawBody);
  } catch {
    return jsonResponse(400, { error: "Invalid JSON payload." }, origin);
  }

  await env.STATE_KV.put(STATE_KEY, rawBody);
  return jsonResponse(200, { ok: true }, origin);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "*";

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...corsHeaders(origin)
        }
      });
    }

    if (url.pathname !== "/api/state") {
      return jsonResponse(404, { error: "Not found" }, origin);
    }

    if (!isAuthorized(request, env)) {
      return unauthorized(origin);
    }

    if (request.method === "GET") {
      return handleGet(env, origin);
    }

    if (request.method === "PUT") {
      return handlePut(request, env, origin);
    }

    return jsonResponse(405, { error: "Method not allowed" }, origin);
  }
};
