// Isolated Auth/PostgREST protocol fixture. Never connects to the real project.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const users = new Map();
const sessions = new Map();
const notes = [];
function session(user) {
  const payload = { sub: user.id, email: user.email, role: "authenticated", aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 };
  const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.test-signature`;
  sessions.set(token, user);
  return { access_token: token, refresh_token: randomUUID(), token_type: "bearer", expires_in: 3600, user };
}

createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:3100");
  res.setHeader("Access-Control-Allow-Headers", "authorization,apikey,content-type,x-client-info,x-supabase-api-version,prefer,accept,accept-profile,content-profile");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  const send = (status, body) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(body === undefined ? undefined : JSON.stringify(body)); };
  if (req.method === "OPTIONS") return send(204);
  const url = new URL(req.url, "http://127.0.0.1:54329");
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  const user = sessions.get(req.headers.authorization?.replace("Bearer ", ""));
  const fail = (code, msg, status = 400) => send(status, { code, error_code: code, msg });
  if (url.pathname === "/health") return send(200, { ok: true });
  if (url.pathname === "/__test/reset") { users.clear(); sessions.clear(); notes.length = 0; return send(200, {}); }
  if (url.pathname === "/__test/mail") {
    const account = users.get(url.searchParams.get("email"));
    return account ? send(200, { token_hash: account.id }) : send(404, {});
  }
  if (url.pathname === "/auth/v1/signup") {
    await new Promise((resolve) => setTimeout(resolve, 150));
    if (users.has(body.email)) return send(200, { ...users.get(body.email), identities: [] });
    const account = { id: randomUUID(), email: body.email, password: body.password, aud: "authenticated", role: "authenticated", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, identities: [], created_at: new Date().toISOString() };
    users.set(body.email, account);
    return send(200, account);
  }
  if (url.pathname === "/auth/v1/verify") {
    const account = [...users.values()].find((item) => item.id === body.token_hash);
    if (!account || (account.email_confirmed_at && body.type !== "recovery")) return fail("otp_expired", "Expired link");
    account.email_confirmed_at = new Date().toISOString();
    return send(200, session(account));
  }
  if (url.pathname === "/auth/v1/token") {
    const account = users.get(body.email);
    if (!account || account.password !== body.password) return fail("invalid_credentials", "Invalid credentials");
    if (!account.email_confirmed_at) return fail("email_not_confirmed", "Email not confirmed");
    return send(200, session(account));
  }
  if (url.pathname === "/auth/v1/user") {
    if (!user) return fail("bad_jwt", "Unauthorized", 401);
    if (req.method === "PUT") user.password = body.password;
    return send(200, user);
  }
  if (url.pathname === "/auth/v1/logout") return send(204);
  if (url.pathname === "/auth/v1/recover" || url.pathname === "/auth/v1/resend") return send(200, {});
  if (url.pathname.startsWith("/rest/v1/")) {
    if (!user) return fail("unauthorized", "Unauthorized", 401);
    if (url.pathname === "/rest/v1/notes") {
      const id = url.searchParams.get("id")?.replace("eq.", "");
      const owned = notes.filter((note) => note.user_id === user.id && (!id || note.id === id));
      if (req.method === "POST") {
        if (body.user_id !== user.id) return fail("42501", "Wrong owner", 403);
        notes.push({ ...body, updated_at: new Date().toISOString() });
        return send(201);
      }
      if (req.method === "PATCH") { owned.forEach((note) => Object.assign(note, body)); return send(204); }
      if (req.method === "DELETE") { owned.forEach((note) => notes.splice(notes.indexOf(note), 1)); return send(204); }
      return send(200, owned);
    }
    if (url.pathname === "/rest/v1/settings") return send(200, null);
    return send(200, []);
  }
  send(404, { message: `Unknown fixture route: ${url.pathname}` });
}).listen(54329, "127.0.0.1");
