
# Guía de Despliegue en Coolify (VPS)

Esta aplicación ha sido transformada a una arquitectura **Full-Stack** con **Express** y **PostgreSQL**, lista para ser desplegada en tu VPS usando **Coolify**.

## 1. Subir a GitHub
1. Crea un nuevo repositorio en GitHub.
2. Sube todos los archivos de este proyecto (excepto `node_modules` y `dist`).
   - Asegúrate de incluir el `Dockerfile` y el `server.ts`.

## 2. Configuración de Base de Datos en Coolify
1. En Coolify, ve a **Resources** -> **New** -> **Database** -> **PostgreSQL**.
2. Configura un nombre (ej: `inventario-db`) y haz clic en **Deploy**.
3. Una vez desplegada, copia la **Internal Connection String** (ej: `postgres://...`).

## 3. Configuración de la Aplicación en Coolify
1. Crea un **Nuevo Recurso** -> **Aplicación Pública/Privada de GitHub**.
2. Selecciona tu repositorio y la rama principal.
3. Coolify detectará el `Dockerfile`.

## 4. Variables de Entorno
En la pestaña **Environment Variables** de tu aplicación, añade:
1. `DATABASE_URL`: Pega la cadena de conexión que copiaste en el paso 2.
2. `GEMINI_API_KEY`: Tu clave de API de Google AI Studio.
3. `NODE_ENV=production`.

## 5. Configuración del Subdominio
1. En la pestaña **Domains**, ingresa: `https://inventario.facore.cl`.
2. Asegúrate de que tu registro DNS (tipo A) apunte `inventario.facore.cl` a la IP de tu VPS.

## 6. Desplegar
Haz clic en **Deploy**. Coolify construirá la imagen, conectará la base de datos y configurará el SSL automáticamente.
