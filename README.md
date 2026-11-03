# TaskBoard

Gestor de tareas web: permite **crear, listar, marcar como completadas y eliminar tareas**.
Proyecto del taller de **Ingeniería Web** — Universidad Manuela Beltrán.

| Servicio | URL |
|---|---|
| API (backend) | https://taskboard-api-dci1.onrender.com |
| Estado de la API | https://taskboard-api-dci1.onrender.com/api/health |
| Aplicación (frontend) | _Pendiente — fase siguiente_ |

> El plan gratuito de Render suspende el servicio tras un periodo sin uso: la primera petición puede tardar cerca de un minuto.

## Integrantes

- Pablo Andrés Salazar Salazar
- José Fernando Téllez Espinosa
- Juan Davids Traslaviña Lara

## Arquitectura

La aplicación se compone de tres servicios independientes desplegados en **Render**, región **Virginia (US East)**:

```
Navegador ──► Frontend (React + Vite) ──► Backend (Node.js + Express) ──► PostgreSQL
               Static Site                 Web Service                    Render Postgres
```

| Componente | Tecnología | Servicio en Render | Responsabilidad |
|---|---|---|---|
| Frontend | React + Vite | Static Site | Interfaz de usuario; consume la API con `fetch`. |
| Backend | Node.js + Express | Web Service (`taskboard-api`) | API REST, validación y reglas de negocio. |
| Base de datos | PostgreSQL | Render Postgres (`taskboard-db`) | Persistencia de las tareas. |

El backend está organizado en capas según el patrón **MVC** y los principios **SOLID**:
`Rutas → Controlador → Servicio → Repositorio → PostgreSQL`. Más detalle en [`backend/README.md`](backend/README.md).

## Estructura del repositorio

```
taskboard/
├── backend/     API REST (Node.js + Express + PostgreSQL)
├── frontend/    Interfaz (React + Vite) — fase siguiente
└── README.md
```

## API

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| GET | `/` | Información de la API y lista de endpoints | 200 |
| GET | `/api/health` | Estado del servicio | 200 |
| GET | `/api/tasks` | Lista todas las tareas | 200 |
| POST | `/api/tasks` | Crea una tarea. Cuerpo: `{"title": "..."}` | 201, 400 |
| PATCH | `/api/tasks/:id` | Completa o reabre una tarea. Cuerpo: `{"done": true}` | 200, 400, 404 |
| DELETE | `/api/tasks/:id` | Elimina una tarea | 204, 400, 404 |

## Ejecución local

**Requisitos:** Node.js LTS, Git y la *External Database URL* de la base en Render.

### Backend

```bash
git clone https://github.com/Pasalazar83/taskboard.git
cd taskboard/backend
npm install
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
```

Editar `backend/.env` con la URL de la base de datos y luego:

```bash
npm start                   # http://localhost:3000
npm test                    # pruebas automáticas (no requieren base de datos)
```

### Frontend

_Pendiente — se documentará en la fase del frontend._

## Variables de entorno

### Backend (`backend/.env`)

| Variable | Local | Producción (Render) |
|---|---|---|
| `DATABASE_URL` | External Database URL | Internal Database URL |
| `DB_SSL` | `true` | `false` |
| `FRONTEND_URL` | `http://localhost:5173` | URL del Static Site (sin barra final) |
| `PORT` | `3000` | Asignada por Render |

### Frontend (`frontend/.env`)

| Variable | Local | Producción (Render) |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | `https://taskboard-api-dci1.onrender.com` |

> Los archivos `.env` contienen credenciales y **nunca** se suben al repositorio (están en `.gitignore`).

## Despliegue en Render

| Parámetro | Backend (Web Service) | Frontend (Static Site) |
|---|---|---|
| Root Directory | `backend` | `frontend` |
| Build Command | `npm install` | `npm install && npm run build` |
| Start / Publish | `npm start` | `dist` |
| Health Check | `/api/health` | — |
| Región | Virginia (US East) | Virginia (US East) |

Cada `git push` a la rama `main` se despliega automáticamente (*Auto-Deploy*).

## Seguridad

- Consultas SQL parametrizadas y validación de toda entrada (prevención de inyección).
- Errores genéricos que no exponen detalles internos.
- Límite de 10 kb en el cuerpo de las peticiones (las más grandes responden 413).
- CORS restringido al origen definido en `FRONTEND_URL`.
- Credenciales solo en variables de entorno; `.env` excluido del repositorio.

## Estado

- [x] Base de datos PostgreSQL en Render
- [x] Backend con los cinco endpoints, desplegado y probado
- [x] Arquitectura en capas (MVC + SOLID) y pruebas automáticas
- [ ] Frontend en React publicado como Static Site
- [ ] `FRONTEND_URL` configurada en el backend
