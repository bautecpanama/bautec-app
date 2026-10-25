# Bautec — Render Free + Supabase Free

Estado: adaptación preparada y probada con PostgreSQL embebido. No hay recursos creados ni conexión probada con una cuenta real. La instalación local SQLite y el paquete de Google se conservan.

## Qué se utiliza

Render ejecuta Node.js; Supabase aloja PostgreSQL. Se mantienen los usuarios y contraseñas de Bautec, sesiones y auditoría. Esta versión NO usa Supabase Auth ni expone su API de datos al navegador. El servidor conecta directamente a PostgreSQL usando su configuración privada. El esquema bautec no se expone mediante la API pública y se revocan permisos de PUBLIC sobre él.

Los archivos HTML, imagen de acceso y datos de partida se incluyen en esta carpeta. Los datos editados quedan en Supabase, no en el disco temporal de Render. Reiniciar no vuelve a cargar la semilla sobre datos existentes.

## 1. Cuentas gratuitas

Crear cuenta en Supabase y proyecto Free llamado Bautec; guardar su contraseña de base en un gestor privado. Crear cuenta en Render y mantener plan Free. Para publicar los archivos, usar un repositorio privado de GitHub conectado a Render. No subir bases, respaldos privados, .env ni contraseñas. La semilla contiene información de proyectos: mantener también el repositorio privado.

## 2. Conectar la base

En Supabase > Connect copiar la URI del Session pooler (puerto 5432, compatible con IPv4). Introducir la contraseña codificada para URI cuando contenga símbolos. Guardarla SOLO como variable secreta DATABASE_URL en Render. No enviarla por chat ni ponerla en HTML/GitHub. El plan inicial no requiere comprar IPv4 dedicada.

El certificado TLS se valida. Si Supabase requiere su certificado CA, descargarlo de su panel y añadirlo como Secret File en Render; definir BAUTEC_DB_CA_FILE=/etc/secrets/NOMBRE_DEL_ARCHIVO. No desactivar la validación con rejectUnauthorized:false.

## 3. Publicar

Subir únicamente los archivos de esta carpeta como raíz del repositorio privado. En Render crear Web Service desde ese repositorio:

- Plan: Free; Node.js 24.22.1.
- Build: npm ci.
- Start: npm start.
- Health check: /healthz.
- DATABASE_URL: conexión privada de Supabase.
- BAUTEC_SETUP_TOKEN: clave aleatoria larga de activación inicial, mínimo 32 caracteres; conservarla en privado. El archivo render.yaml puede generar esa clave mediante Blueprint. La instalación manual requiere generarla en el gestor de contraseñas.

Render proporciona el enlace HTTPS. La aplicación escucha el PORT del alojamiento. No necesita disco persistente ni Docker.

## 4. Migrar antes de registrar usuarios

Si la instalación anterior ya tiene cuentas, preferir la migración completa antes del primer registro en la nube:

```sh
node transfer.mjs import-sqlite RUTA_A_COPIA_VERIFICADA.sqlite
```

Ejecutarlo localmente con Node 24, npm ci y DATABASE_URL disponible solo en el entorno local. Usar una copia consistente creada con el backup.mjs del paquete Google, no copiar una base activa sin su WAL. Conserva cuentas, hashes y auditoría. Rechaza un destino que ya tenga cuentas, cambios o historial. No traslada sesiones; los usuarios vuelven a entrar. Mantener la instalación anterior como recuperación hasta verificar el traslado.

Si solo existen datos del antiguo HTML, abrir la pantalla de acceso de nube, introducir la clave de activación junto con el primer administrador y seleccionar el JSON en Conservar datos anteriores. Ese JSON no recupera cuentas ni historial del servicio.

En una instalación nueva usar la clave BAUTEC_SETUP_TOKEN solo para crear al primer administrador. No está incluida en la página y se exige en el servidor. Después de registrar o migrar, eliminar la variable de Render y volver a desplegar: el registro inicial quedará bloqueado. El administrador da de alta a otros usuarios desde Bautec.

## 5. Respaldos

```sh
node transfer.mjs export Bautec-2026-10-24-privado.json
```

El respaldo completo contiene hashes de contraseñas, proyectos y auditoría; no contiene sesiones. Guardarlo en una carpeta privada, por ejemplo OneDrive. No sobrescribe archivos existentes. Para recuperar en una base vacía inicializada:

```sh
node transfer.mjs restore Bautec-2026-10-24-privado.json
```

La copia automática externa aún no está configurada. Supabase Free no sustituye una política de respaldo propia. No usar el backup SQLite para PostgreSQL.

## 6. Verificar antes de uso diario

Probar HTTPS, primer registro/migración, acceso normal sin permisos de historial, altas/desactivación, guardado desde celular/tablet/PC, conflicto de dos guardados y persistencia tras reiniciar Render. Probar una exportación completa y recuperación en proyecto de prueba. No fusiona ediciones simultáneas: avisa de conflicto y requiere recargar.

Render Free duerme tras 15 minutos sin tráfico y puede tardar alrededor de un minuto en responder al volver. Supabase Free limita la base a 500 MB y pausa proyectos inactivos; consultar condiciones actuales. Las solicitudes y cuotas adicionales dependen de la cuenta. No se han activado planes de pago ni prometido un servicio sin interrupciones.

Referencias:
- https://render.com/docs/free
- https://supabase.com/pricing
- https://supabase.com/docs/guides/database/connecting-to-postgres
- https://node-postgres.com/features/ssl
