
# Usa una imagen base de Node.js
FROM node:20-slim

# Establece el directorio de trabajo
WORKDIR /app

# Copia los archivos de configuración de npm
COPY package*.json ./

# Instala TODAS las dependencias (incluyendo las necesarias para el build)
RUN npm install --include=dev

# Copia el resto de los archivos
COPY . .

# Construye la aplicación frontend
RUN npm run build

# Expone el puerto 3000
EXPOSE 3000

# Define la variable de entorno para producción
ENV NODE_ENV=production

# Comando para iniciar la aplicación
CMD ["npm", "start"]
