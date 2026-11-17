# TaskBoard

Aplicación personal de tareas para el proyecto de Ingeniería Web. React + Vite, Express y PostgreSQL. Cada cuenta accede únicamente a sus tareas.

## Funciones

- Registro, inicio/cierre de sesión y recuperación de contraseña.
- Tablero de tres estados y vista de lista; búsqueda, prioridad y filtro de tareas para hoy.
- Crear, editar, completar, reabrir y eliminar tareas.
- Descripciones con TinyMCE (texto simple mientras no se configure la clave).
- Ubicación opcional con Google Maps / Places (New), selección en mapa y enlace al lugar.
- Clima de la ubicación del dispositivo con OpenWeatherMap. Requiere permiso; se actualiza mientras la aplicación está abierta.
- Correo desde admin@ingcol.space mediante Zoho Mail HTTPS/OAuth: creación, recuperación y recordatorio.
- Cola persistida en PostgreSQL y revisión de vencimientos cada 30 segundos mientras el backend esté activo.

## Ejecutar

Node.js 22 o posterior.

```sh
cd backend
npm ci
# Copiar .env.example a .env y configurar PostgreSQL
npm start
```

En otra terminal:

```sh
cd frontend
npm ci
# Copiar .env.example a .env
npm run dev
```

Para probar SIN PostgreSQL ni servicios externos: desde backend ejecutar `node scripts/preview.js`. Usa datos temporales en memoria, requiere las dependencias de desarrollo y NO envía correos. Abrir frontend en http://127.0.0.1:5173; crear una cuenta ficticia. Al reiniciar se pierden los datos de esta vista previa.

## Comprobaciones

```sh
cd backend
npm test
cd ../frontend
npm run build
```

Las pruebas verifican rutas HTTP con pg-mem, aislamiento entre cuentas, saneamiento HTML, recuperación de acceso, recordatorios y contratos de Zoho/clima con respuestas simuladas. No sustituyen la validación final contra PostgreSQL real y las cuentas de los proveedores. pg-mem no simula fielmente concurrencia ni rollback.

## Publicación y claves

Seguir [docs/PRESENTACION.md](docs/PRESENTACION.md). Las integraciones están implementadas, pero requieren sus claves y la autorización real de Zoho. No poner secretos en variables VITE_*.

## API

Todas las rutas de tareas, clima y estado de integraciones requieren `Authorization: Bearer <token>`.

| Método | Ruta | Uso |
| --- | --- | --- |
| POST | /api/auth/register | name, email, password (10–128 caracteres) |
| POST | /api/auth/login | email, password |
| GET | /api/auth/me | Cuenta actual |
| POST | /api/auth/logout | Revoca sesión |
| POST | /api/auth/forgot-password | email |
| POST | /api/auth/reset-password | token, password |
| GET / POST | /api/tasks | Listar / crear |
| PATCH / DELETE | /api/tasks/:id | Editar / eliminar tarea propia |
| GET | /api/weather?lat=4.6&lon=-74.1 | Clima en °C y español |
| GET | /api/integrations | Disponibilidad de correo y clima |
| GET | /api/health | Conectividad de la base |

Una tarea admite title, description (HTML saneado), status (pending/progress/done), priority (low/medium/high), due_at (ISO 8601 o null), reminder_minutes (0–10080) y location (null o {label,lat,lng,place_id}).
PATCH también admite done para compatibilidad. El API v2 exige autenticación; los clientes v1 deben actualizarse.

## Datos y seguridad

La migración aditiva corre al iniciar. Conserva las tareas antiguas sin dueño (user_id NULL); nunca las asigna automáticamente ni las expone a usuarios nuevos. Las contraseñas usan scrypt con sal; sesiones y tokens de recuperación se guardan con hash SHA-256. Los enlaces vencen en 30 minutos y revocan las sesiones al usarse. Hay límites de solicitudes y HTML permitido por lista. Las sesiones del frontend viven en sessionStorage.

Alcance de demostración: registro sin verificación de propiedad del correo, sin equipos ni adjuntos. Antes de abrir el registro al público se debe añadir verificación de email y control de abuso de envíos. La cola usa reintentos y una clave única por tarea/vencimiento; un fallo entre el envío al proveedor y el registro local puede duplicar un correo (entrega al menos una vez, no exactamente una vez). Los recordatorios no corren mientras Render está suspendido; al volver se procesan vencimientos pendientes.

El código v1 de controladores/repositorios/rutas se conserva como referencia, pero el punto de entrada activo es src/app.js y las nuevas funciones de src/services.
