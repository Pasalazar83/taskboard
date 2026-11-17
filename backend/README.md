# TaskBoard — Backend v2

API REST de TaskBoard con **Node.js 22+, Express y PostgreSQL**, organizada en capas según el patrón **MVC** y los principios **SOLID**.
Consulta el [README principal](../README.md) y la [guía de configuración](../docs/PRESENTACION.md).

## Endpoints

| Método | Ruta | Descripción | Sesión |
|---|---|---|---|
| GET | `/` y `/api` | Información de la API y sus endpoints | No |
| GET | `/api/health` | Estado del servicio y de la base de datos | No |
| POST | `/api/auth/register` | Crea una cuenta e inicia sesión | No |
| POST | `/api/auth/login` | Inicia sesión | No |
| POST | `/api/auth/forgot-password` | Envía un enlace de recuperación por correo | No |
| POST | `/api/auth/reset-password` | Cambia la contraseña con el enlace | No |
| GET | `/api/auth/me` | Usuario de la sesión actual | Sí |
| POST | `/api/auth/logout` | Cierra la sesión | Sí |
| GET | `/api/tasks` | Lista las tareas del usuario | Sí |
| POST | `/api/tasks` | Crea una tarea | Sí |
| PATCH | `/api/tasks/:id` | Modifica, cambia de estado o completa una tarea | Sí |
| DELETE | `/api/tasks/:id` | Elimina una tarea | Sí |
| GET | `/api/integrations` | Estado del correo y del clima | Sí |
| GET | `/api/weather?lat=&lon=` | Clima actual por coordenadas | Sí |

Las rutas privadas usan la cabecera `Authorization: Bearer <token>`.

## Estructura

```
backend/
├── index.js                     Arranque: base, migración, correo y recordatorios
├── src/
│   ├── app.js                   Conecta las capas (composition root)
│   ├── config/env.js            Variables de entorno
│   ├── db/                      Conexión, migración (schema-v2.sql) y transacciones
│   ├── errors/AppError.js       Errores de dominio (400, 401, 404, 409, 503…)
│   ├── validators/              Validación: tareas, cuentas y coordenadas
│   ├── repositories/            Acceso a datos (SQL parametrizado)
│   │   ├── UserRepository.js
│   │   ├── SessionRepository.js
│   │   ├── PasswordResetRepository.js
│   │   ├── TaskRepository.js
│   │   └── MailOutboxRepository.js
│   ├── services/                Reglas de negocio e integraciones
│   │   ├── AuthService.js       Registro, sesión y recuperación
│   │   ├── TaskService.js       Tareas y avisos
│   │   ├── WeatherService.js    OpenWeatherMap con caché de 10 min
│   │   ├── ZohoMailer.js        Envío de correo por OAuth
│   │   ├── notifications.js     Cola de correos y recordatorios
│   │   └── security.js          Hash de contraseñas (scrypt) y tokens
│   ├── controllers/             HTTP ⇄ servicios
│   │   ├── SystemController.js
│   │   ├── AuthController.js
│   │   ├── TaskController.js
│   │   └── IntegrationController.js
│   ├── routes/                  Definición de rutas
│   └── middlewares/             Sesión, límites, cabeceras, 404 y errores
└── test/api.test.js             15 pruebas (pg-mem y servicios simulados)
```

Flujo de una petición: **Ruta → Middleware de sesión → Controlador → Servicio → Repositorio → PostgreSQL**.

## MVC y SOLID

| | Aplicación |
|---|---|
| **Modelo** | `services/`, `validators/`, `repositories/` |
| **Vista** | Frontend en React (`../frontend`) |
| **Controlador** | `controllers/` y `routes/` |
| **S** Responsabilidad única | Cada repositorio maneja una tabla; cada servicio, un dominio; los controladores solo traducen HTTP. |
| **O** Abierto/cerrado | Un error nuevo se agrega como subclase de `AppError` sin tocar el manejador central. |
| **L** Sustitución de Liskov | El correo (`ZohoMailer`) y el clima pueden sustituirse por versiones simuladas con el mismo contrato; las pruebas lo hacen. |
| **I** Segregación de interfaces | Los controladores solo conocen su servicio; nunca la base de datos. |
| **D** Inversión de dependencias | Los servicios reciben repositorios, correo y clima por constructor; solo `app.js` e `index.js` los crean. |

## Seguridad

- Contraseñas con **scrypt** y sal aleatoria; los tokens de sesión y recuperación se guardan solo como hash SHA-256.
- Cada consulta de tareas filtra por `user_id`: un usuario no puede ver ni modificar tareas ajenas.
- Límites de peticiones por IP (general, inicio de sesión y recuperación) y cuerpo máximo de 64 kb.
- HTML de las descripciones saneado con `sanitize-html`.
- La recuperación no revela si un correo está registrado; el enlace vence en 30 minutos y es de un solo uso.
- CORS restringido a `FRONTEND_URL`; errores genéricos sin detalles internos.

## Ejecución

```bash
npm ci
npm test        # no requiere base de datos
npm start       # requiere DATABASE_URL en .env
```

La migración (`src/db/schema-v2.sql`) es idempotente y conserva las tareas existentes: las tareas creadas antes de la v2 quedan sin dueño y no se asignan automáticamente a ninguna cuenta. `schema.sql` se conserva como referencia del esquema original.
