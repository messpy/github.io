const allowedOrigin = "https://messpy.github.io";

function cors(request) {
  const origin = request.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": origin === allowedOrigin ? origin : allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function json(data, status = 200, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...cors(request) },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors(request) });
    const url = new URL(request.url);
    if (url.pathname === "/api/health") return json({ ok: true }, 200, request);
    if (url.pathname !== "/api/visitors") return json({ error: "not found" }, 404, request);

    if (request.method === "GET") {
      const result = await env.DB.prepare(
        "SELECT id,name,planet,color,personality,talent,texture,hobby,favorite,size,rings,seed,born FROM visitors ORDER BY updated_at DESC LIMIT 200"
      ).all();
      return json({ stars: result.results || [] }, 200, request);
    }
    if (request.method !== "POST") return json({ error: "method not allowed" }, 405, request);

    const body = await request.json();
    const required = ["id", "name", "planet", "color", "personality", "talent", "texture", "hobby", "favorite", "size", "seed", "born"];
    if (required.some((key) => typeof body[key] === "undefined")) return json({ error: "invalid visitor" }, 400, request);
    const visitor = { ...body, rings: body.rings ? 1 : 0, updated_at: new Date().toISOString() };
    await env.DB.prepare(`INSERT INTO visitors (id,name,planet,color,personality,talent,texture,hobby,favorite,size,rings,seed,born,updated_at)
      VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)
      ON CONFLICT(id) DO UPDATE SET name=?2,planet=?3,color=?4,personality=?5,talent=?6,texture=?7,hobby=?8,favorite=?9,size=?10,rings=?11,seed=?12,born=?13,updated_at=?14`)
      .bind(visitor.id, visitor.name, visitor.planet, visitor.color, visitor.personality, visitor.talent, visitor.texture, visitor.hobby, visitor.favorite, visitor.size, visitor.rings, visitor.seed, visitor.born, visitor.updated_at)
      .run();
    const result = await env.DB.prepare("SELECT id,name,planet,color,personality,talent,texture,hobby,favorite,size,rings,seed,born FROM visitors ORDER BY updated_at DESC LIMIT 200").all();
    return json({ me: visitor, stars: result.results || [] }, 200, request);
  },
};
