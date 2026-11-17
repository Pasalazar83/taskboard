const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { newDb } = require("pg-mem");
const { createApp } = require("../src/app");
const { migrate } = require("../src/db/migrate");
const { createNotificationWorker } = require("../src/services/notifications");
const { digest } = require("../src/services/security");
const { ZohoMailer } = require("../src/services/ZohoMailer");
const { createWeatherService } = require("../src/services/WeatherService");
let pool, server, base, a, b, id;
const sent = [];
const mailer = {
  enabled: true,
  send: async (mail) => {
    sent.push(mail);
  },
};
const logger = {
  error(message) {
    throw new Error(message);
  },
};
const call = async (method, url, body, token) => {
  const res = await fetch(base + url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: res.status,
    data: res.status === 204 ? null : await res.json(),
  };
};
before(async () => {
  // pg-mem does not consume constraints on repeated CREATE IF NOT EXISTS.
  const db = newDb({ noAstCoverageCheck: true });
  const pg = db.adapters.createPg();
  pool = new pg.Pool();
  await migrate(pool);
  server = createApp({
    pool,
    mailer,
    config: { frontendUrl: "https://ingcol.space" },
    logger,
  }).listen(0);
  await new Promise((r) => server.once("listening", r));
  base = "http://127.0.0.1:" + server.address().port;
});
after(async () => {
  await new Promise((r) => server.close(r));
  await pool.end();
});
test("health comprueba la base", async () =>
  assert.equal((await call("GET", "/api/health")).status, 200));
test("registro, hash de contraseña y correo normalizado", async () => {
  a = await call("POST", "/api/auth/register", {
    name: "Pablo",
    email: " PABLO@example.com ",
    password: "UnaClaveSegura123",
  });
  b = await call("POST", "/api/auth/register", {
    name: "Otra persona",
    email: "otra@example.com",
    password: "OtraClaveSegura123",
  });
  assert.equal(a.status, 201);
  assert.equal(b.status, 201);
  a = a.data;
  b = b.data;
  assert.equal(a.user.email, "pablo@example.com");
  const { rows } = await pool.query(
    "SELECT password_hash FROM users WHERE id=$1",
    [a.user.id],
  );
  assert.notEqual(rows[0].password_hash, "UnaClaveSegura123");
  assert.ok(!("password_hash" in a.user));
});
test("rutas privadas y login incorrecto", async () => {
  assert.equal((await call("GET", "/api/tasks")).status, 401);
  assert.equal(
    (
      await call("POST", "/api/auth/login", {
        email: a.user.email,
        password: "claveIncorrecta",
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await call("POST", "/api/auth/login", {
        email: a.user.email,
        password: "UnaClaveSegura123",
      })
    ).status,
    200,
  );
});
test("creación sanea HTML y encola aviso", async () => {
  const res = await call(
    "POST",
    "/api/tasks",
    {
      title: "Preparar presentación",
      description:
        '<p>Hola<script>alert(1)</script><a href="javascript:alert(1)">link</a></p>',
      due_at: new Date(Date.now() + 120000).toISOString(),
      reminder_minutes: 5,
      location: { label: "Universidad", lat: 4.6, lng: -74.1 },
    },
    a.token,
  );
  assert.equal(res.status, 201);
  id = res.data.id;
  assert.equal(res.data.notification, "queued");
  assert.ok(!res.data.description.includes("script"));
  assert.equal(res.data.location.label, "Universidad");
  assert.equal((await pool.query("SELECT * FROM mail_outbox")).rowCount, 1);
});
test("otro usuario no puede listar, editar ni borrar tareas ajenas", async () => {
  assert.deepEqual(
    (await call("GET", "/api/tasks", undefined, b.token)).data,
    [],
  );
  assert.equal(
    (await call("PATCH", "/api/tasks/" + id, { title: "Ajena" }, b.token))
      .status,
    404,
  );
  assert.equal(
    (await call("DELETE", "/api/tasks/" + id, undefined, b.token)).status,
    404,
  );
  assert.equal(
    (await call("GET", "/api/tasks", undefined, a.token)).data.length,
    1,
  );
});
test("validaciones de título, prioridad, fechas, ubicación y JSON", async () => {
  for (const body of [
    { title: "" },
    { title: "x".repeat(201) },
    { title: "x", priority: "urgent" },
    { title: "x", due_at: "ayer" },
    { title: "x", location: { label: "x", lat: 91, lng: 0 } },
    { title: "x", reminder_minutes: -1 },
  ])
    assert.equal((await call("POST", "/api/tasks", body, a.token)).status, 400);
  const res = await fetch(base + "/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{malo",
  });
  assert.equal(res.status, 400);
});
test("worker envía creación y recordatorio una vez en ticks consecutivos", async () => {
  const tick = createNotificationWorker(pool, mailer, logger);
  await tick();
  await tick();
  assert.equal(sent.filter((m) => m.kind === "created").length, 1);
  assert.equal(sent.filter((m) => m.kind === "reminder").length, 1);
  const { rows } = await pool.query("SELECT * FROM mail_outbox");
  assert.ok(rows.every((m) => m.status === "sent"));
});
test("completar sincroniza done y permite editar título", async () => {
  const res = await call(
    "PATCH",
    "/api/tasks/" + id,
    { status: "done", title: "Presentación lista" },
    a.token,
  );
  assert.equal(res.status, 200);
  assert.equal(res.data.done, true);
  assert.equal(res.data.title, "Presentación lista");
});
test("tareas completadas no generan recordatorios", async () => {
  const res = await call(
    "POST",
    "/api/tasks",
    {
      title: "Ya terminada",
      status: "done",
      due_at: new Date(Date.now() - 60000).toISOString(),
    },
    a.token,
  );
  await createNotificationWorker(pool, mailer, logger)();
  assert.equal(
    sent.filter((m) => m.kind === "reminder" && m.task_id === res.data.id)
      .length,
    0,
  );
});
test("recuperación no revela cuentas, token vence y solo se usa una vez", async () => {
  const known = await call("POST", "/api/auth/forgot-password", {
    email: a.user.email,
  });
  const unknown = await call("POST", "/api/auth/forgot-password", {
    email: "nadie@example.com",
  });
  assert.deepEqual(known, unknown);
  const { rows } = await pool.query(
    "SELECT * FROM mail_outbox WHERE kind='reset' ORDER BY id DESC",
  );
  const token = rows[0].content.split("#reset=")[1];
  assert.ok(token);
  assert.equal(
    (
      await pool.query("SELECT * FROM password_resets WHERE token_hash=$1", [
        digest(token),
      ])
    ).rowCount,
    1,
  );
  const result = await call("POST", "/api/auth/reset-password", {
    token,
    password: "NuevaClaveSegura123",
  });
  assert.equal(result.status, 200);
  assert.equal(
    (
      await call("POST", "/api/auth/reset-password", {
        token,
        password: "NuevaClaveSegura456",
      })
    ).status,
    400,
  );
  assert.equal(
    (await call("GET", "/api/auth/me", undefined, a.token)).status,
    401,
  );
  const login = await call("POST", "/api/auth/login", {
    email: a.user.email,
    password: "NuevaClaveSegura123",
  });
  assert.equal(login.status, 200);
  a = login.data;
  await call("POST", "/api/auth/forgot-password", { email: a.user.email });
  const { rows: later } = await pool.query(
    "SELECT * FROM mail_outbox WHERE kind='reset' ORDER BY id DESC",
  );
  const expired = later[0].content.split("#reset=")[1];
  await pool.query("UPDATE password_resets SET expires_at=$1", [
    new Date(Date.now() - 60000),
  ]);
  assert.equal(
    (
      await call("POST", "/api/auth/reset-password", {
        token: expired,
        password: "OtraClaveSegura123",
      })
    ).status,
    400,
  );
});
test("eliminar tarea y cerrar sesión revoca acceso", async () => {
  assert.equal(
    (await call("DELETE", "/api/tasks/" + id, undefined, a.token)).status,
    204,
  );
  assert.equal(
    (await call("DELETE", "/api/tasks/" + id, undefined, a.token)).status,
    404,
  );
  assert.equal(
    (await call("POST", "/api/auth/logout", undefined, a.token)).status,
    204,
  );
  assert.equal(
    (await call("GET", "/api/auth/me", undefined, a.token)).status,
    401,
  );
});
test("migración conserva tareas antiguas sin asignar a otro usuario", async () => {
  await pool.query("INSERT INTO tasks (title,done) VALUES ('Antigua',true)");
  await migrate(pool);
  const { rows } = await pool.query(
    "SELECT * FROM tasks WHERE title='Antigua'",
  );
  assert.equal(rows[0].user_id, null);
  assert.equal(rows[0].status, "done");
  assert.equal(
    (await call("GET", "/api/tasks", undefined, b.token)).data.length,
    0,
  );
});
test("Zoho renueva OAuth, usa HTTPS y reutiliza token", async () => {
  const requests = [];
  const client = new ZohoMailer(
    {
      zohoClientId: "test",
      zohoClientSecret: "secret",
      zohoRefreshToken: "refresh",
      zohoAccountId: "1",
      zohoAccountsUrl: "https://accounts.zoho.com",
      zohoMailUrl: "https://mail.zoho.com",
      mailFrom: "dav@ingcol.space",
    },
    async (url, options) => {
      requests.push({ url, options });
      return {
        ok: true,
        json: async () =>
          url.includes("/oauth/")
            ? { access_token: "access", expires_in: 3600 }
            : { status: { code: 200 } },
      };
    },
  );
  await client.send({
    recipient: "a@example.com",
    subject: "Tarea",
    content: "Hola",
  });
  await client.send({
    recipient: "b@example.com",
    subject: "Tarea",
    content: "Hola",
  });
  assert.equal(requests.length, 3);
  assert.equal(
    requests[1].options.headers.Authorization,
    "Zoho-oauthtoken access",
  );
  assert.equal(
    JSON.parse(requests[1].options.body).fromAddress,
    "dav@ingcol.space",
  );
});
test("clima cacheado por coordenadas, Celsius y español", async () => {
  let calls = 0;
  const weather = createWeatherService("fake", async (url) => {
    calls++;
    assert.ok(url.includes("units=metric"));
    assert.ok(url.includes("lang=es"));
    return {
      ok: true,
      json: async () => ({
        name: "Bogotá",
        main: { temp: 19.5, humidity: 60 },
        weather: [{ description: "nublado" }],
      }),
    };
  });
  assert.equal((await weather(4.6, -74.1)).temperature, 20);
  await weather(4.6, -74.1);
  assert.equal(calls, 1);
  await assert.rejects(createWeatherService("")(4.6, -74.1), /configurado/);
});
