# TaskBoard

Gestor de tareas web: cada persona crea su cuenta y administra sus tareas en un tablero (por hacer, en progreso, completadas).
Proyecto final de **Ingeniería Web** — Universidad Manuela Beltrán.

| | URL |
|---|---|
| **Aplicación (frontend)** | https://taskboard-web-8g0m.onrender.com |
| **API (backend)** | https://taskboard-api-dci1.onrender.com |
| **Estado de la API** | https://taskboard-api-dci1.onrender.com/api/health |

> El plan gratuito de Render suspende los servicios tras unos minutos sin uso: la primera petición puede tardar cerca de un minuto.

## Integrantes

- Pablo Andrés Salazar Salazar
- José Fernando Téllez Espinosa
- Juan Davids Traslaviña Lara

## Funciones

- Registro, inicio y cierre de sesión, y recuperación de contraseña por correo.
- Tablero de tres estados y vista de lista, con búsqueda y prioridad.
- Crear, editar, completar, reabrir y eliminar tareas. Cada cuenta ve solo sus tareas.
- Correos automáticos desde `admin@ingcol.space`: bienvenida, tarea creada, tarea completada, recordatorio y recuperación de contraseña.
- Integraciones opcionales: clima (OpenWeatherMap), ubicación en mapa (Google Maps) y editor de texto (TinyMCE). Sin sus claves, la aplicación funciona en modo básico.

## Arquitectura

```
Navegador ──► Frontend (React + Vite) ──► Backend (Node.js + Express) ──► PostgreSQL
              Render Static Site           Render Web Service              Render Postgres
```

Los tres servicios están en Render (región Virginia). La API y la base de datos se comunican por la red privada de Render.

El backend está organizado en capas según el patrón **MVC** y los principios **SOLID**:

```
Ruta → Middleware de sesión → Controlador → Servicio → Repositorio → PostgreSQL
```

| MVC | Carpetas |
|---|---|
| **Modelo** | `backend/src/services`, `validators`, `repositories` |
| **Vista** | `frontend/` (React) |
| **Controlador** | `backend/src/controllers`, `routes` |

Detalle de capas, principios SOLID y seguridad en [backend/README.md](backend/README.md).

## Estructura

```
taskboard/
├── backend/     API REST (Node.js + Express + PostgreSQL) y pruebas
├── frontend/    Interfaz (React + Vite)
├── docs/        Guía de configuración de servicios externos
└── README.md
```

## API

Las rutas de tareas, clima e integraciones requieren `Authorization: Bearer <token>` (se obtiene al registrarse o iniciar sesión).

| Método | Ruta | Uso |
|---|---|---|
| GET | `/` | Información de la API y sus endpoints |
| GET | `/api/health` | Estado del servicio y de la base de datos |
| POST | `/api/auth/register` | Crear cuenta: `name`, `email`, `password` (10–128 caracteres) |
| POST | `/api/auth/login` | Iniciar sesión: `email`, `password` |
| GET | `/api/auth/me` | Cuenta actual |
| POST | `/api/auth/logout` | Cerrar sesión |
| POST | `/api/auth/forgot-password` | Enviar enlace de recuperación |
| POST | `/api/auth/reset-password` | Cambiar contraseña con el enlace |
| GET / POST | `/api/tasks` | Listar / crear tareas |
| PATCH / DELETE | `/api/tasks/:id` | Editar, completar / eliminar una tarea propia |
| GET | `/api/weather?lat=&lon=` | Clima actual en °C |
| GET | `/api/integrations` | Estado del correo y del clima |

Una tarea admite `title`, `description` (HTML saneado), `status` (`pending`/`progress`/`done`), `priority` (`low`/`medium`/`high`), `due_at`, `reminder_minutes` y `location`.

## Ejecución local

Requisitos: **Node.js 22 o posterior** y Git.

```sh
git clone https://github.com/Pasalazar83/taskboard.git
cd taskboard/backend
npm ci
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
# Editar .env con la External Database URL de Render y DB_SSL=true
npm start                 # http://localhost:3000
```

En otra terminal:

```sh
cd taskboard/frontend
npm ci
cp .env.example .env      # VITE_API_URL=http://localhost:3000
npm run dev               # http://localhost:5173
```

Vista previa sin PostgreSQL ni servicios externos: desde `backend`, `node scripts/preview.js` (datos temporales en memoria; no envía correos).

## Pruebas

```sh
cd backend
npm test          # 15 pruebas: rutas, aislamiento entre cuentas, seguridad, correos y migración
cd ../frontend
npm run build
```

Las pruebas usan una base en memoria (pg-mem) y servicios externos simulados, por lo que no requieren credenciales.

## Variables de entorno

### Backend (`backend/.env` en local, *Environment* en Render)

| Variable | Local | Producción (Render) |
|---|---|---|
| `DATABASE_URL` | External Database URL | Internal Database URL |
| `DB_SSL` | `true` | `false` |
| `FRONTEND_URL` | `http://localhost:5173` | `https://taskboard-web-8g0m.onrender.com` |
| `PORT` | `3000` | Asignado por Render |
| `TRUST_PROXY` | — | `1` |
| `NODE_VERSION` | — | `22` |
| `MAIL_FROM` | `admin@ingcol.space` | `admin@ingcol.space` |
| `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_ACCOUNT_ID` | Opcional | Credenciales OAuth de Zoho Mail |
| `OPENWEATHER_API_KEY` | Opcional | Opcional |

### Frontend (`frontend/.env` en local, *Environment* del Static Site en Render)

| Variable | Local | Producción (Render) |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | `https://taskboard-api-dci1.onrender.com` |
| `VITE_GOOGLE_MAPS_API_KEY` | Opcional | Opcional |
| `VITE_TINYMCE_API_KEY` | Opcional | Opcional |

Los archivos `.env` contienen credenciales y **no** se suben al repositorio (están en `.gitignore`).

## Despliegue en Render

| Parámetro | Backend (Web Service) | Frontend (Static Site) |
|---|---|---|
| Root Directory | `backend` | `frontend` |
| Build Command | `npm ci` | `npm ci && npm run build` |
| Start / Publish | `npm start` | `dist` |
| Health Check | `/api/health` | — |

Cada `git push` a `main` se despliega automáticamente. La configuración de los servicios externos está en [docs/PRESENTACION.md](docs/PRESENTACION.md).

## Seguridad

- Contraseñas con scrypt y sal; sesiones y enlaces de recuperación guardados solo como hash SHA-256.
- Cada consulta filtra por usuario: nadie puede ver ni modificar tareas ajenas.
- Consultas SQL parametrizadas, validación de toda entrada y HTML de descripciones saneado.
- Límites de peticiones por IP, cuerpo máximo de 64 kb y CORS restringido al frontend.
- Credenciales solo en variables de entorno; errores sin detalles internos.

La migración de la base es aditiva: conserva las tareas creadas antes de las cuentas de usuario, sin asignarlas a nadie.
