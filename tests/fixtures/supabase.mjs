// Isolated Auth/PostgREST protocol fixture. Never connects to the real project.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const users = new Map();
const sessions = new Map();
const tables = Object.fromEntries(["notes", "tasks", "events", "projects", "goals", "daily_goals", "habits", "habit_records", "journal_entries", "cs_study_logs", "resources", "settings"].map((name) => [name, []]));
function defaults(table) {
  const common = { id: randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), description: "" };
  const values = {
    notes: { content: "", tags: [], category: "메모" }, tasks: { status: "todo", priority: "medium", category: "개인", due_time: null, project_id: null },
    events: { source_task_id: null, start_time: null, end_time: null, category: "일정" },
    projects: { status: "planning", progress: 0, thumbnail: null, start_date: null, due_date: null, github_url: null, deploy_url: null, memo: "" },
    goals: { status: "active", progress: 0, category: "개인", icon: "◎" }, habits: { active: true, frequency: "daily", target_count: 1, icon: "✓" },
    settings: { timezone: "Asia/Seoul", weather_location: "충주시", daily_quote: "오늘의 꾸준함이, 내일의 실력이 된다." },
  };
  return { ...common, ...values[table] };
}
function session(user) {
  const payload = { sub: user.id, email: user.email, role: "authenticated", aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 };
  const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.test-signature`;
  sessions.set(token, user);
  return { access_token: token, refresh_token: randomUUID(), token_type: "bearer", expires_in: 3600, user };
}

createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:3197");
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
  if (url.pathname === "/__test/reset") { users.clear(); sessions.clear(); Object.values(tables).forEach((rows) => { rows.length = 0; }); return send(200, {}); }
  if (url.pathname === "/__test/data") return send(200, tables);
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
    const table = url.pathname.split("/").at(-1);
    if (tables[table]) {
      const rows = tables[table];
      const owned = rows.filter((row) => row.user_id === user.id && [...url.searchParams].every(([key, value]) => {
        if (["select", "order", "limit", "on_conflict"].includes(key)) return true;
        const dot = value.indexOf("."); const operator = value.slice(0, dot); const target = value.slice(dot + 1);
        const actual = String(row[key]);
        if (operator === "eq") return actual === target;
        if (operator === "neq") return actual !== target;
        if (operator === "gte") return actual >= target;
        if (operator === "lte") return actual <= target;
        if (operator === "in") return target.slice(1, -1).split(",").includes(actual);
        return true;
      }));
      const output = (result) => req.headers.accept?.includes("vnd.pgrst.object") ? result[0] ?? null : result;
      if (req.method === "POST") {
        const written = [];
        for (const value of Array.isArray(body) ? body : [body]) {
          if (value.user_id !== user.id) return fail("42501", "Wrong owner", 403);
          const conflict = (url.searchParams.get("on_conflict") ?? "id").split(",");
          const existing = req.headers.prefer?.includes("resolution=merge-duplicates") && rows.find((row) => row.user_id === user.id && conflict.every((key) => value[key] !== undefined && row[key] === value[key]));
          if (existing) { Object.assign(existing, value); written.push(existing); }
          else { const next = { ...defaults(table), ...value }; rows.push(next); written.push(next); }
        }
        return send(201, req.headers.prefer?.includes("return=representation") ? output(written) : undefined);
      }
      if (req.method === "PATCH") {
        if (body.user_id && body.user_id !== user.id) return fail("42501", "Wrong owner", 403);
        owned.forEach((row) => Object.assign(row, body, { updated_at: new Date().toISOString() }));
        return req.headers.prefer?.includes("return=representation") ? send(200, output(owned)) : send(204);
      }
      if (req.method === "DELETE") {
        owned.forEach((row) => {
          rows.splice(rows.indexOf(row), 1);
          if (table === "tasks") tables.events = tables.events.filter((event) => event.source_task_id !== row.id);
          if (table === "projects") tables.tasks.forEach((task) => { if (task.project_id === row.id) task.project_id = null; });
        });
        return send(204);
      }
      let result = owned.map((row) => table === "projects" && url.searchParams.get("select")?.includes("tasks(") ? { ...row, tasks: tables.tasks.filter((task) => task.user_id === user.id && task.project_id === row.id) } : row);
      if (url.searchParams.has("limit")) result = result.slice(0, Number(url.searchParams.get("limit")));
      if (table === "settings") return send(200, result[0] ?? null);
      return send(200, output(result));
    }
    return send(200, []);
  }
  send(404, { message: `Unknown fixture route: ${url.pathname}` });
}).listen(54329, "127.0.0.1");
