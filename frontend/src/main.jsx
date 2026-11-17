import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Editor } from "@tinymce/tinymce-react";
import {
  LayoutDashboard,
  List,
  Search,
  Plus,
  ArrowUpRight,
  ArrowRight,
  Check,
  CheckCheck,
  Clock,
  CalendarDays,
  MapPin,
  Flag,
  X,
  Trash2,
  LogOut,
  ChevronRight,
  Bell,
  LoaderCircle,
  Mail,
  PanelLeftClose,
  Layers,
  SlidersHorizontal,
} from "lucide-react";
import { api, json } from "./api";
import { Weather, LocationPicker } from "./Integrations";
import "./style.css";
const states = [
  ["pending", "Por hacer"],
  ["progress", "En progreso"],
  ["done", "Completadas"],
];
const priorities = { high: "Alta", medium: "Media", low: "Baja" };
const dateLabel = (value) =>
  value
    ? new Date(value).toLocaleDateString("es-CO", {
        day: "numeric",
        month: "short",
      })
    : "Sin fecha";
const plain = (html) =>
  new DOMParser().parseFromString(html || "", "text/html").body.textContent;
function Brand() {
  return (
    <a className="brand" href="/" aria-label="TaskBoard, inicio">
      <span className="brand-mark">
        <Layers size={21} />
      </span>
      TaskBoard<span className="brand-dot">.</span>
    </a>
  );
}
function Auth({ onLogin }) {
  const reset = useRef(
    window.location.hash.startsWith("#reset=")
      ? window.location.hash.slice(7)
      : "",
  );
  const [mode, setMode] = useState(reset.current ? "reset" : "login"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    if (reset.current)
      history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
  }, []);
  const change = (mode) => {
    setMode(mode);
    setError("");
    setNotice("");
  };
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const body = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const endpoint = {
        login: "login",
        register: "register",
        forgot: "forgot-password",
        reset: "reset-password",
      }[mode];
      const result = await api(
        "/auth/" + endpoint,
        json("POST", {
          ...body,
          ...(mode === "reset" ? { token: reset.current } : {}),
        }),
      );
      if (result.token) {
        sessionStorage.setItem("taskboard-token", result.token);
        onLogin(result.user);
      } else {
        setNotice(result.message);
        if (mode === "reset") setMode("login");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <section className="auth-story">
        <Brand />
        <div className="story-content">
          <span className="eyebrow">MENOS RUIDO. MÁS CLARIDAD.</span>
          <h1>
            Tu día,
            <br />
            en orden<span>.</span>
          </h1>
          <p>
            Un espacio para organizar tus ideas,
            <br />
            dar el siguiente paso y ver cómo avanzas.
          </p>
          <div className="story-board" aria-hidden="true">
            <div className="mini-card">
              <span className="mini-check">
                <Check size={15} />
              </span>
              <div>
                <b>Un paso a la vez</b>
                <small>Cada tarea cuenta</small>
              </div>
              <span className="mini-pill">Hecho</span>
            </div>
            <div className="mini-card second">
              <span className="mini-check blue">
                <Clock size={15} />
              </span>
              <div>
                <b>Lo importante, a la vista</b>
                <small>Tu próximo objetivo</small>
              </div>
              <ArrowUpRight size={20} />
            </div>
          </div>
        </div>
        <p className="story-footer">Planea con intención. Avanza a tu ritmo.</p>
      </section>
      <main className="auth-form-wrap">
        <div className="auth-top">TU ESPACIO PERSONAL</div>
        <div className="auth-form">
          <span className="welcome-icon">
            <LayoutDashboard size={24} />
          </span>
          <h2>
            {
              {
                login: "Qué bueno verte",
                register: "Empieza con claridad",
                forgot: "Recupera tu acceso",
                reset: "Una nueva contraseña",
              }[mode]
            }
          </h2>
          <p>
            {
              {
                login: "Tus pendientes, tus planes y tu próximo paso.",
                register: "Crea tu cuenta y dale un lugar a tus pendientes.",
                forgot: "Te enviaremos un enlace a tu correo.",
                reset: "Elige una contraseña de al menos 10 caracteres.",
              }[mode]
            }
          </p>
          <form onSubmit={submit}>
            {mode === "register" && (
              <label>
                Tu nombre
                <input
                  name="name"
                  placeholder="¿Cómo te llamas?"
                  maxLength={80}
                  required
                  autoComplete="name"
                />
              </label>
            )}
            {mode !== "reset" && (
              <label>
                Correo electrónico
                <input
                  name="email"
                  type="email"
                  placeholder="tu@correo.com"
                  required
                  maxLength={254}
                  autoComplete="email"
                />
              </label>
            )}
            {mode !== "forgot" && (
              <label>
                Contraseña
                <input
                  name="password"
                  type="password"
                  placeholder="Al menos 10 caracteres"
                  minLength={10}
                  maxLength={128}
                  required
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                />
              </label>
            )}
            {mode === "login" && (
              <button
                type="button"
                className="text-button forgot"
                onClick={() => change("forgot")}
              >
                Olvidé mi contraseña
              </button>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="success" role="status">
                {notice}
              </p>
            )}
            <button className="primary auth-submit" disabled={busy}>
              {busy ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <>
                  {
                    {
                      login: "Entrar a mi espacio",
                      register: "Crear mi cuenta",
                      forgot: "Enviar enlace",
                      reset: "Guardar contraseña",
                    }[mode]
                  }
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          <p className="auth-switch">
            {mode === "login" ? (
              <>
                ¿Aún no tienes cuenta?{" "}
                <button
                  className="text-button"
                  onClick={() => change("register")}
                >
                  Regístrate
                </button>
              </>
            ) : (
              <button className="text-button" onClick={() => change("login")}>
                Volver a iniciar sesión
              </button>
            )}
          </p>
          <div className="privacy">
            <CheckCheck size={15} /> Un tablero privado, solo para ti.
          </div>
        </div>
        <footer>TaskBoard · ingcol.space</footer>
      </main>
    </div>
  );
}
function TaskEditor({ task, onClose, onSave, onDelete, mailEnabled }) {
  const [form, setForm] = useState(() => ({
    title: "",
    description: "",
    status: "pending",
    priority: "medium",
    due_at: "",
    reminder_minutes: 1440,
    location: null,
    ...task,
  }));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false);
  const [editorFailed, setEditorFailed] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const localDate = form.due_at
    ? new Date(
        new Date(form.due_at).getTime() -
          new Date(form.due_at).getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16)
    : "";
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave(form);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      await onDelete(task.id);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      className="task-dialog"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <form onSubmit={submit}>
        <header className="dialog-header">
          <div>
            <span className="eyebrow">DALE ESPACIO A LO IMPORTANTE</span>
            <h2>{task?.id ? "Detalles de la tarea" : "Una nueva tarea"}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Cerrar"
            disabled={busy}
            onClick={onClose}
          >
            <X />
          </button>
        </header>
        <div className="dialog-body">
          <label>
            ¿Qué quieres hacer?
            <input
              autoFocus
              name="title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              required
              maxLength={200}
              placeholder="Ej. Preparar la presentación del proyecto"
            />
          </label>
          <div className="form-row">
            <label>
              Estado
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {states.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Prioridad
              <select
                value={form.priority}
                onChange={(e) => set("priority", e.target.value)}
              >
                {Object.entries(priorities).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="field">
            <label htmlFor="description">Descripción</label>
            {import.meta.env.VITE_TINYMCE_API_KEY && !editorFailed ? (
              <Editor
                id="description"
                apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                value={form.description}
                onEditorChange={(v) => set("description", v)}
                onScriptsLoadError={() => setEditorFailed(true)}
                init={{
                  height: 220,
                  ui_mode: "split",
                  link_quicklink: true,
                  menubar: false,
                  plugins: "lists link",
                  toolbar:
                    "undo redo | bold italic | bullist numlist | link | removeformat",
                  branding: false,
                  promotion: false,
                  content_style: "body{font-family:system-ui;font-size:14px}",
                  setup: (editor) => editor.on("init", () => {}),
                }}
              />
            ) : (
              <>
                <textarea
                  id="description"
                  rows={5}
                  value={plain(form.description)}
                  onChange={(e) =>
                    set(
                      "description",
                      e.target.value
                        .replaceAll("&", "&amp;")
                        .replaceAll("<", "&lt;")
                        .replaceAll(">", "&gt;"),
                    )
                  }
                  placeholder="Agrega contexto, ideas o los pasos a seguir…"
                />
                <small className="hint">
                  Editor de texto simple. TinyMCE se activa al configurar su
                  clave.
                </small>
              </>
            )}
          </div>
          <div className="form-row">
            <label>
              Fecha y hora de vencimiento
              <input
                type="datetime-local"
                value={localDate}
                onChange={(e) =>
                  set(
                    "due_at",
                    e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  )
                }
              />
            </label>
            <label>
              Recordarme
              <select
                value={form.reminder_minutes}
                onChange={(e) =>
                  set("reminder_minutes", Number(e.target.value))
                }
              >
                <option value={0}>Al vencer</option>
                <option value={1}>1 minuto antes · demo</option>
                <option value={5}>5 minutos antes</option>
                <option value={60}>1 hora antes</option>
                <option value={1440}>1 día antes</option>
              </select>
            </label>
          </div>
          <div className="field">
            <label>
              <MapPin size={15} /> Ubicación{" "}
              <span className="optional">opcional</span>
            </label>
            <LocationPicker
              value={form.location}
              onChange={(v) => set("location", v)}
            />
            {form.location && !import.meta.env.VITE_GOOGLE_MAPS_API_KEY && (
              <p>
                {form.location.label}{" "}
                <button
                  type="button"
                  className="text-button"
                  onClick={() => set("location", null)}
                >
                  Quitar ubicación
                </button>
              </p>
            )}
          </div>
          <div className="mail-note">
            <Bell size={16} />
            <span>
              {mailEnabled
                ? "Recibirás avisos en el correo de tu cuenta."
                : "El envío de correos está pendiente de configurar."}
            </span>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {confirm && (
            <div className="delete-confirm">
              ¿Eliminar esta tarea definitivamente?
              <button
                type="button"
                className="danger"
                disabled={busy}
                onClick={remove}
              >
                Sí, eliminar
              </button>
              <button type="button" onClick={() => setConfirm(false)}>
                Cancelar
              </button>
            </div>
          )}
        </div>
        <footer className="dialog-footer">
          {task?.id && (
            <button
              type="button"
              className="icon-button danger-text"
              aria-label="Eliminar tarea"
              disabled={busy}
              onClick={() => setConfirm(true)}
            >
              <Trash2 size={19} />
            </button>
          )}
          <div className="footer-actions">
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={onClose}
            >
              Cancelar
            </button>
            <button className="primary" disabled={busy}>
              {busy ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <Check size={18} />
              )}{" "}
              {task?.id ? "Guardar cambios" : "Crear tarea"}
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
function TaskCard({ task, onOpen, onStatus, busy }) {
  const overdue =
    task.due_at && new Date(task.due_at) < new Date() && task.status !== "done";
  return (
    <article
      className={"task-card " + (task.status === "done" ? "completed" : "")}
    >
      <div className="card-top">
        <span className={"priority " + task.priority}>
          <span /> {priorities[task.priority]}
        </span>
        <button
          className={"check-task " + (task.status === "done" ? "checked" : "")}
          aria-label={
            task.status === "done"
              ? "Reabrir " + task.title
              : "Completar " + task.title
          }
          disabled={busy}
          onClick={() =>
            onStatus(task, task.status === "done" ? "pending" : "done")
          }
        >
          {task.status === "done" && <Check size={13} />}
        </button>
      </div>
      <button className="card-content" onClick={() => onOpen(task)}>
        <h3>{task.title}</h3>
        {task.description && <p>{plain(task.description).slice(0, 130)}</p>}
      </button>
      {task.location && (
        <a
          className="task-location"
          href={
            "https://www.google.com/maps/search/?api=1&query=" +
            encodeURIComponent(task.location.lat + "," + task.location.lng) +
            (task.location.place_id
              ? "&query_place_id=" + encodeURIComponent(task.location.place_id)
              : "")
          }
          target="_blank"
          rel="noreferrer"
        >
          <MapPin size={13} />
          <span>{task.location.label}</span>
          <ArrowUpRight size={12} />
        </a>
      )}
      <div className="card-footer">
        <span className={overdue ? "overdue" : ""}>
          <CalendarDays size={13} />
          {dateLabel(task.due_at)}
          {overdue ? " · Vencida" : ""}
        </span>
        <select
          aria-label={"Estado de " + task.title}
          value={task.status}
          disabled={busy}
          onChange={(e) => onStatus(task, e.target.value)}
        >
          {states.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}
function Dashboard({ user, onLogout }) {
  const [tasks, setTasks] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [view, setView] = useState("board"),
    [filter, setFilter] = useState("all"),
    [priority, setPriority] = useState("all"),
    [editor, setEditor] = useState(null),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(null),
    [integrations, setIntegrations] = useState({}),
    [menu, setMenu] = useState(false);
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [tasks, config] = await Promise.all([
        api("/tasks"),
        api("/integrations"),
      ]);
      setTasks(tasks);
      setIntegrations(config);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  async function save(form) {
    const task = await api(
      "/tasks" + (form.id ? "/" + form.id : ""),
      json(form.id ? "PATCH" : "POST", form),
    );
    setTasks((list) =>
      form.id
        ? list.map((t) => (t.id === task.id ? task : t))
        : [task, ...list],
    );
    setNotice(
      form.id
        ? "Cambios guardados"
        : task.notification === "queued"
          ? "Tarea creada. Aviso por correo en cola."
          : "Tarea creada",
    );
  }
  async function remove(id) {
    await api("/tasks/" + id, { method: "DELETE" });
    setTasks((list) => list.filter((t) => t.id !== id));
    setNotice("Tarea eliminada");
  }
  async function status(task, value) {
    setBusy(task.id);
    try {
      const next = await api(
        "/tasks/" + task.id,
        json("PATCH", { status: value }),
      );
      setTasks((list) => list.map((t) => (t.id === next.id ? next : t)));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }
  const counts = Object.fromEntries(
    states.map(([id]) => [id, tasks.filter((t) => t.status === id).length]),
  );
  const today = (t) =>
    t.due_at && new Date(t.due_at).toDateString() === new Date().toDateString();
  const visible = tasks.filter(
    (t) =>
      (filter === "all" ||
        (filter === "today" && today(t)) ||
        (filter === "done" && t.status === "done")) &&
      (priority === "all" || t.priority === priority) &&
      (t.title + " " + plain(t.description))
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const progress = tasks.length
    ? Math.round((counts.done / tasks.length) * 100)
    : 0;
  const first = user.name.split(" ")[0];
  return (
    <div className="app-shell">
      <aside className={"sidebar " + (menu ? "open" : "")}>
        <Brand />
        <div className="workspace">
          <span className="workspace-icon">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <b>Mi espacio</b>
            <small>Personal</small>
          </div>
          <span className="workspace-lock">PRIVADO</span>
        </div>
        <div className="nav-label">ORGANIZACIÓN</div>
        <nav>
          {[
            ["all", LayoutDashboard, "Mi tablero", tasks.length],
            ["today", CalendarDays, "Para hoy", tasks.filter(today).length],
            ["done", CheckCheck, "Completadas", counts.done],
          ].map(([id, Icon, label, count]) => (
            <button
              key={id}
              className={filter === id ? "active" : ""}
              onClick={() => {
                setFilter(id);
                setMenu(false);
              }}
            >
              <Icon size={18} />
              {label}
              <span>{count}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="focus-note">
            <span>UN PASO A LA VEZ</span>
            <h3>
              Haz espacio
              <br />
              para avanzar.
            </h3>
            <p>
              Las grandes ideas empiezan
              <br />
              con una pequeña tarea.
            </p>
            <div className="note-art">
              <span />
              <span />
              <span />
            </div>
          </div>
          <button className="profile" onClick={onLogout} title="Cerrar sesión">
            <span className="avatar">
              {user.name.slice(0, 2).toUpperCase()}
            </span>
            <span>
              <b>{user.name}</b>
              <small>Cerrar sesión</small>
            </span>
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Abrir menú"
              onClick={() => setMenu(!menu)}
            >
              <PanelLeftClose size={20} />
            </button>
            Mi espacio <ChevronRight size={14} />
            <strong>
              {filter === "today"
                ? "Para hoy"
                : filter === "done"
                  ? "Completadas"
                  : "Mi tablero"}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="today-date">
              {new Date().toLocaleDateString("es-CO", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
            <span className="avatar small">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>
        <main className="dashboard">
          <section className="page-heading">
            <div>
              <span className="eyebrow">UN BUEN DÍA PARA AVANZAR</span>
              <h1>
                Hola, {first}
                <span className="greeting-dot">.</span>
              </h1>
              <p>Un poco de orden. Más espacio para lo que importa.</p>
            </div>
            <Weather />
          </section>
          <section className="stats" aria-label="Resumen de tareas">
            <div className="stat">
              <span className="stat-icon blue">
                <Layers size={19} />
              </span>
              <div>
                <small>Total de tareas</small>
                <strong>
                  {tasks.length}
                  <span>en tu espacio</span>
                </strong>
              </div>
            </div>
            <div className="stat">
              <span className="stat-icon amber">
                <Clock size={19} />
              </span>
              <div>
                <small>En progreso</small>
                <strong>
                  {counts.progress}
                  <span>paso a paso</span>
                </strong>
              </div>
            </div>
            <div className="stat">
              <span className="stat-icon green">
                <CheckCheck size={19} />
              </span>
              <div>
                <small>Completadas</small>
                <strong>
                  {counts.done}
                  <span>¡bien hecho!</span>
                </strong>
              </div>
            </div>
            <div className="stat progress-stat">
              <div className="progress-label">
                <small>Tu avance</small>
                <strong>{progress}%</strong>
              </div>
              <div className="progress-track">
                <span style={{ width: progress + "%" }} />
              </div>
              <small>Cada paso suma.</small>
            </div>
          </section>
          <section className="board-section">
            <div className="board-heading">
              <div>
                <h2>
                  {filter === "today"
                    ? "Tu agenda de hoy"
                    : filter === "done"
                      ? "Lo que ya lograste"
                      : "Tu tablero"}
                </h2>
                <p>
                  {filter === "today"
                    ? "Las tareas que vencen hoy."
                    : "Todo lo que tienes en mente, en un solo lugar."}
                </p>
              </div>
              <button className="primary" onClick={() => setEditor({})}>
                <Plus size={18} />
                Nueva tarea
              </button>
            </div>
            <div className="toolbar">
              <div className="view-tabs">
                <button
                  className={view === "board" ? "selected" : ""}
                  onClick={() => setView("board")}
                >
                  <LayoutDashboard size={16} />
                  Tablero
                </button>
                <button
                  className={view === "list" ? "selected" : ""}
                  onClick={() => setView("list")}
                >
                  <List size={17} />
                  Lista
                </button>
              </div>
              <div className="search-filters">
                <label className="search">
                  <Search size={16} />
                  <input
                    aria-label="Buscar tareas"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar una tarea…"
                  />
                  {query && (
                    <button
                      className="icon-button"
                      aria-label="Limpiar búsqueda"
                      onClick={() => setQuery("")}
                    >
                      <X size={14} />
                    </button>
                  )}
                </label>
                <label className="priority-filter">
                  <SlidersHorizontal size={16} />
                  <select
                    aria-label="Filtrar por prioridad"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="all">Prioridad</option>
                    {Object.entries(priorities).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            {error && (
              <div className="error" role="alert">
                {error}{" "}
                <button className="text-button" onClick={refresh}>
                  Reintentar
                </button>
              </div>
            )}
            {loading ? (
              <div className="loading">
                <LoaderCircle className="spin" />
                Preparando tu espacio…
                <small>
                  El primer inicio del servidor puede tardar un momento.
                </small>
              </div>
            ) : view === "board" ? (
              <div className="kanban">
                {states.map(([id, label]) => (
                  <section key={id} className={"column " + id}>
                    <header>
                      <span className="status-dot" />
                      <h3>{label}</h3>
                      <span className="count">
                        {visible.filter((t) => t.status === id).length}
                      </span>
                      <button
                        className="icon-button"
                        aria-label={"Agregar tarea en " + label}
                        onClick={() => setEditor({ status: id })}
                      >
                        <Plus size={16} />
                      </button>
                    </header>
                    <div className="column-content">
                      {visible
                        .filter((t) => t.status === id)
                        .map((t) => (
                          <TaskCard
                            key={t.id}
                            task={t}
                            onOpen={setEditor}
                            onStatus={status}
                            busy={busy === t.id}
                          />
                        ))}
                      {!visible.some((t) => t.status === id) && (
                        <div className="empty-column">
                          <span>
                            {id === "done" ? (
                              <CheckCheck size={25} />
                            ) : id === "progress" ? (
                              <Clock size={25} />
                            ) : (
                              <Layers size={25} />
                            )}
                          </span>
                          <b>
                            {id === "done"
                              ? "Aquí van tus logros"
                              : id === "progress"
                                ? "Dale el primer impulso"
                                : "Todo empieza con una idea"}
                          </b>
                          <p>
                            {query || priority !== "all"
                              ? "No hay tareas con estos filtros."
                              : id === "done"
                                ? "Completa una tarea y celebra tu avance."
                                : id === "progress"
                                  ? "Cambia el estado de una tarea para empezar."
                                  : "Agrega tu primera tarea para comenzar."}
                          </p>
                        </div>
                      )}
                      <button
                        className="add-card"
                        onClick={() => setEditor({ status: id })}
                      >
                        <Plus size={15} />
                        Agregar tarea
                      </button>
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="task-list">
                {visible.length ? (
                  visible.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      onOpen={setEditor}
                      onStatus={status}
                      busy={busy === t.id}
                    />
                  ))
                ) : (
                  <div className="empty-column">
                    <Search size={24} />
                    <b>No hay tareas para mostrar</b>
                    <p>Crea una tarea o cambia los filtros.</p>
                  </div>
                )}
              </div>
            )}
          </section>
          <footer className="dashboard-footer">
            <span>
              <span className="live-dot" />
              Tu espacio, a tu ritmo.
            </span>
            <span>Hecho para enfocarte.</span>
          </footer>
        </main>
      </div>
      {editor && (
        <TaskEditor
          key={editor.id || "new"}
          task={editor}
          onClose={() => setEditor(null)}
          onSave={save}
          onDelete={remove}
          mailEnabled={integrations.mail}
        />
      )}{" "}
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          {notice}
        </div>
      )}
    </div>
  );
}
function App() {
  const [user, setUser] = useState(null),
    [boot, setBoot] = useState(true),
    [error, setError] = useState("");
  async function load() {
    setError("");
    setBoot(true);
    if (window.location.hash.startsWith("#reset=")) {
      setUser(null);
      setBoot(false);
      return;
    }
    if (sessionStorage.getItem("taskboard-token")) {
      try {
        setUser(await api("/auth/me"));
      } catch (e) {
        if (e.status === 401) sessionStorage.removeItem("taskboard-token");
        else setError(e.message);
      }
    }
    setBoot(false);
  }
  useEffect(() => {
    load();
    const expired = () => {
      sessionStorage.removeItem("taskboard-token");
      setUser(null);
    };
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, []);
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {}
    sessionStorage.removeItem("taskboard-token");
    setUser(null);
  }
  if (boot)
    return (
      <div className="boot">
        <Brand />
        <LoaderCircle className="spin" />
        <p>Abriendo tu espacio…</p>
      </div>
    );
  if (error)
    return (
      <div className="boot">
        <Brand />
        <p role="alert">{error}</p>
        <button className="primary" onClick={load}>
          Reintentar conexión
        </button>
      </div>
    );
  return user ? (
    <Dashboard user={user} onLogout={logout} />
  ) : (
    <Auth onLogin={setUser} />
  );
}
createRoot(document.getElementById("root")).render(<App />);
