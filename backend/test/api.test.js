// Pruebas de la API usando el repositorio en memoria (no requieren base de datos).
// Ejecutar con: npm test
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../src/app");
const { InMemoryTaskRepository } = require("../src/repositories/InMemoryTaskRepository");

let server;
let base;

before(async () => {
  const app = createApp({ taskRepository: new InMemoryTaskRepository(), logger: { error() {} } });
  server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const req = (method, path, body, raw) => fetch(base + path, {
  method,
  headers: body !== undefined || raw ? { "Content-Type": "application/json" } : {},
  body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined)
});

test("GET /api/health responde ok", async () => {
  const res = await req("GET", "/api/health");
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: "ok" });
});

test("POST crea una tarea (201)", async () => {
  const res = await req("POST", "/api/tasks", { title: "  Primera tarea  " });
  assert.equal(res.status, 201);
  const task = await res.json();
  assert.equal(task.title, "Primera tarea");
  assert.equal(task.done, false);
});

test("POST rechaza título vacío (400)", async () => {
  const res = await req("POST", "/api/tasks", { title: "   " });
  assert.equal(res.status, 400);
});

test("POST rechaza título de más de 200 caracteres (400)", async () => {
  const res = await req("POST", "/api/tasks", { title: "x".repeat(201) });
  assert.equal(res.status, 400);
});

test("POST rechaza JSON inválido (400)", async () => {
  const res = await req("POST", "/api/tasks", undefined, "{malo");
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: "JSON inválido" });
});

test("POST rechaza cuerpos de más de 10 kb (413)", async () => {
  const res = await req("POST", "/api/tasks", { title: "x".repeat(20000) });
  assert.equal(res.status, 413);
});

test("GET lista las tareas", async () => {
  const res = await req("GET", "/api/tasks");
  assert.equal(res.status, 200);
  assert.equal((await res.json()).length, 1);
});

test("PATCH con done=true marca la tarea", async () => {
  const res = await req("PATCH", "/api/tasks/1", { done: true });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).done, true);
});

test("PATCH sin cuerpo alterna el estado", async () => {
  const res = await req("PATCH", "/api/tasks/1");
  assert.equal((await res.json()).done, false);
});

test("PATCH con done no booleano (400)", async () => {
  const res = await req("PATCH", "/api/tasks/1", { done: "si" });
  assert.equal(res.status, 400);
});

test("PATCH con id inválido (400) e inexistente (404)", async () => {
  assert.equal((await req("PATCH", "/api/tasks/abc", { done: true })).status, 400);
  assert.equal((await req("PATCH", "/api/tasks/999", { done: true })).status, 404);
});

test("DELETE elimina (204) y luego no la encuentra (404)", async () => {
  assert.equal((await req("DELETE", "/api/tasks/1")).status, 204);
  assert.equal((await req("DELETE", "/api/tasks/1")).status, 404);
});

test("GET / y GET /api describen la API", async () => {
  for (const path of ["/", "/api"]) {
    const res = await req("GET", path);
    assert.equal(res.status, 200);
    const info = await res.json();
    assert.equal(info.name, "TaskBoard API");
    assert.equal(info.endpoints.length, 5);
  }
});

test("Ruta inexistente (404)", async () => {
  const res = await req("GET", "/api/nada");
  assert.equal(res.status, 404);
});
