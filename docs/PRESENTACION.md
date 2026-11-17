# Configuración y ensayo de la presentación

Estado: código preparado; faltan las claves reales y el despliegue. No se han modificado DNS, el servicio Render ni la cuenta de Zoho.

## 1. Backend existente en Render

Usar la rama de la implementación para una prueba coordinada; integrar a main cuando se revise el cambio. El servicio actual despliega main automáticamente según el README anterior.

- Root Directory: backend
- Build Command: npm ci
- Start Command: npm start
- Health Check: /api/health
- Node: 22 o posterior
- Conservar DATABASE_URL existente. DB_SSL según la conexión elegida.
- FRONTEND_URL: URL exacta de la web, sin barra final (ej. https://ingcol.space SOLO si allí está el frontend).
- TRUST_PROXY=1
- REMINDER_INTERVAL_MS=30000

No crear otra base si la existente está disponible. La migración conserva las tareas anteriores sin dueño. No atribuirlas automáticamente a una cuenta.

## 2. Frontend como Static Site en Render

- Repositorio: Pasalazar83/taskboard; misma rama que el backend.
- Root Directory: frontend
- Build Command: npm ci && npm run build
- Publish Directory: dist
- VITE_API_URL=https://taskboard-api-dci1.onrender.com
- VITE_GOOGLE_MAPS_API_KEY y VITE_TINYMCE_API_KEY según los pasos siguientes.
- Conectar ingcol.space al Static Site si ese es el dominio web elegido. No reemplazar los registros MX/TXT de Zoho.
- Al cambiar una variable VITE_* hay que reconstruir el frontend.
- FRONTEND_URL del backend debe coincidir exactamente con el origen usado en el navegador.

## 3. OpenWeatherMap

Crear una cuenta y una API key con acceso a Current Weather Data: https://openweathermap.org/api/current

En backend, agregar OPENWEATHER_API_KEY. La clave nunca va al frontend.
La app pide ubicación al abrir el tablero y consulta con latitud/longitud, units=metric y lang=es. Usa caché de 10 minutos. Se necesita HTTPS (localhost sirve para pruebas); sin permiso se muestra un mensaje y un botón para reintentar.

## 4. Google Maps

En Google Cloud crear/seleccionar proyecto; activar Maps JavaScript API y Places API (New), y la facturación que solicite Google. Revisar cuotas y costes antes de activarla.

Crear clave de navegador restringida por referentes HTTP a los dominios exactos del frontend y, si se prueba localmente, localhost/127.0.0.1. Restringir las APIs a las dos anteriores. Guardarla como VITE_GOOGLE_MAPS_API_KEY en el frontend.

Usa PlaceAutocompleteElement y un mapa donde también se puede seleccionar un punto. DEMO_MAP_ID solo permite probar el marcador avanzado; puede reemplazarse por un map ID propio. Confirmar en vivo que la clave, las APIs y el dominio están autorizados.
Documentación: https://developers.google.com/maps/documentation/javascript/place-autocomplete-new

## 5. TinyMCE

Crear cuenta en Tiny Cloud, obtener la clave y autorizar el dominio final en la cuenta. Revisar el plan/cuota. Agregar VITE_TINYMCE_API_KEY y reconstruir.

Sin clave se muestra texto simple. Con clave se carga el editor para listas, enlaces, negrita y cursiva. El backend limpia el HTML para impedir scripts.
Documentación: https://www.tiny.cloud/docs/tinymce/latest/react-ref/

## 6. Zoho Mail (no SMTP en Render gratuito)

Remitente: dav@ingcol.space. La cuenta que autoriza OAuth debe poder enviar desde esa dirección.

1. Abrir la consola oficial https://api-console.zoho.com/ correspondiente al centro de datos de la cuenta y crear un cliente apropiado para uso del servidor (Self Client para esta integración propia).
2. Autorizar el scope mínimo ZohoMail.messages.CREATE. Para consultar el accountId se necesita además el permiso de lectura de cuentas que indique la API oficial (ZohoMail.accounts.READ).
3. Generar un código de autorización y canjearlo por tokens en el endpoint OAuth oficial. El código es breve y de un solo uso. Guardar el refresh_token como secreto.
4. Consultar GET /api/accounts con el access token para identificar el accountId de dav@ingcol.space.
5. Guardar las variables siguientes en el backend de Render:
   - MAIL_FROM=dav@ingcol.space
   - ZOHO_CLIENT_ID
   - ZOHO_CLIENT_SECRET
   - ZOHO_REFRESH_TOKEN
   - ZOHO_ACCOUNT_ID
   - ZOHO_ACCOUNTS_URL=https://accounts.zoho.com
   - ZOHO_MAIL_URL=https://mail.zoho.com
6. Las URLs deben corresponder al centro de datos real de la cuenta (.com, .eu, etc.). No asumir .com si Zoho muestra otro.
7. Reiniciar/desplegar backend y crear una tarea usando una cuenta de prueba con correo que controles. Esperar hasta 30 segundos para el primer intento y revisar la bandeja/spam.

No copiar tokens al repositorio, frontend, capturas ni chat. No usar una contraseña de correo en lugar de OAuth.
Documentación:
- https://www.zoho.com/mail/help/api/using-oauth-2.html
- https://www.zoho.com/mail/help/api/get-all-users-accounts.html
- https://www.zoho.com/mail/help/api/post-send-an-email.html
- https://render.com/docs/free

Si se configura solo una parte de las cuatro variables OAuth, el servicio aparece como pendiente. Una configuración completa solo indica presencia de valores: la entrega real debe verificarse con una prueba.

## 7. Guion de presentación (5 minutos)

1. Abrir la API /api/health y el frontend unos minutos antes para despertar Render.
2. Registrar una cuenta usando un correo propio; iniciar sesión.
3. Crear una tarea con prioridad alta y descripción con formato. Mostrar el correo de creación.
4. Dar permiso de ubicación y mostrar el clima.
5. Buscar un lugar, guardar la tarea y abrir su enlace en Google Maps.
6. Crear una tarea que venza en dos minutos; elegir “1 minuto antes · demo”. Mantener el servidor activo navegando por el tablero. Esperar el recordatorio (revisión cada 30 segundos).
7. Mover tareas entre estados con su selector, completar una, buscar y cambiar a lista.
8. Entrar con una segunda cuenta y mostrar que no ve las tareas de la primera.
9. Cerrar sesión, pedir recuperación y abrir el enlace del correo. Elegir nueva contraseña y volver a entrar.

Si Render se suspende, los avisos quedan pendientes hasta la reactivación. No prometemos puntualidad mientras esté dormido, tal como se acordó para la demo. La cola reintenta hasta cinco veces con espera progresiva; revisar logs y configuración si no llega el correo. No hay confirmación visual de entrega; “en cola” solo indica que se guardó la solicitud.

## Validación realizada

14 pruebas automáticas HTTP/SQL con pg-mem y mocks de los proveedores; build de producción del frontend. Prueba de navegador local: inicio de sesión, crear una tarea, completar, búsqueda, lista/tablero y ancho móvil de 390 px sin desbordamiento horizontal.

Pendiente: PostgreSQL real de Render, OAuth y entrega real de Zoho, mapas con clave, editor TinyMCE con clave, clima real con permiso del dispositivo y DNS/HTTPS del frontend.
