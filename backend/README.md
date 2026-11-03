# TaskBoard — Backend

API REST de TaskBoard construida con **Node.js + Express + PostgreSQL**, organizada en capas siguiendo los principios **SOLID**.

**Producción:** https://taskboard-api-dci1.onrender.com

## Endpoints

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| GET | `/` y `/api` | Información de la API y lista de endpoints | 200 |
| GET | `/api/health` | Estado del servicio | 200 |
| GET | `/api/tasks` | Lista todas las tareas | 200 |
| POST | `/api/tasks` | Crea una tarea. Cuerpo: `{"title": "..."}` | 201, 400 |
| PATCH | `/api/tasks/:id` | Cuerpo `{"done": true\|false}`; sin cuerpo alterna el estado | 200, 400, 404 |
| DELETE | `/api/tasks/:id` | Elimina una tarea | 204, 400, 404 |

## Estructura

```
backend/
├── index.js                          Punto de entrada: crea y conecta las piezas
├── src/
│   ├── app.js                        Construye la app Express (recibe dependencias)
│   ├── config/env.js                 Variables de entorno centralizadas
│   ├── db/
│   │   ├── pool.js                   Fábrica de la conexión a PostgreSQL
│   │   └── migrate.js                Crea la tabla si no existe
│   ├── errors/AppError.js            Errores de dominio (400, 404)
│   ├── validators/taskValidator.js   Validación de título, id y done
│   ├── repositories/
│   │   ├── PostgresTaskRepository.js Acceso a datos real (SQL parametrizado)
│   │   └── InMemoryTaskRepository.js Mismo contrato, en memoria (pruebas)
│   ├── services/TaskService.js       Reglas de negocio
│   ├── controllers/TaskController.js Traduce HTTP ⇄ servicio
│   ├── routes/                       Rutas: info (raíz), health y tasks
│   └── middlewares/                  asyncHandler, notFound, errorHandler
├── test/api.test.js                  Pruebas automáticas (13 casos)
├── schema.sql
└── .env.example
```

Flujo de una petición: **Ruta → Controlador → Servicio → Repositorio → PostgreSQL**.

## Principios SOLID aplicados

| Principio | Cómo se aplica |
|---|---|
| **S** — Responsabilidad única | Cada módulo hace una sola cosa: el validador valida, el repositorio ejecuta SQL, el servicio aplica reglas de negocio, el controlador maneja HTTP y las rutas solo enrutan. |
| **O** — Abierto/cerrado | El manejador de errores trata cualquier `AppError` por su `statusCode`; un nuevo tipo de error (p. ej. 409) se agrega creando una subclase, sin modificar el manejador. Nuevas rutas se agregan con un nuevo router sin tocar los existentes. |
| **L** — Sustitución de Liskov | `PostgresTaskRepository` e `InMemoryTaskRepository` cumplen el mismo contrato y son intercambiables: el servicio funciona igual con cualquiera. `ValidationError` y `NotFoundError` sustituyen a `AppError` sin romper el manejador. |
| **I** — Segregación de interfaces | El repositorio expone solo los métodos que el servicio usa (`findAll`, `create`, `setDone`, `toggleDone`, `delete`); el controlador solo conoce el servicio, no el repositorio ni la base de datos. |
| **D** — Inversión de dependencias | El servicio no crea su repositorio: lo recibe en el constructor. `createApp()` recibe el repositorio desde afuera, y `index.js` (composition root) es el único lugar que conoce PostgreSQL. |

Además se usa un estilo funcional en rutas y *middleware* (funciones de orden superior como `asyncHandler`) y **CORS** restringido al origen de `FRONTEND_URL`.

## Ejecución local

```bash
cd backend
npm install
cp .env.example .env      # en Windows: Copy-Item .env.example .env
# editar .env con la External Database URL de Render y DB_SSL=true
npm start
```

## Pruebas

```bash
npm test
```

Las pruebas usan el repositorio en memoria, así que **no necesitan base de datos**.

## Variables de entorno

| Variable | Local | Producción (Render) |
|---|---|---|
| `DATABASE_URL` | External Database URL | Internal Database URL |
| `DB_SSL` | `true` | `false` |
| `FRONTEND_URL` | `http://localhost:5173` | URL del Static Site |
| `PORT` | `3000` | Asignada por Render |

> El archivo `.env` nunca se sube al repositorio.
