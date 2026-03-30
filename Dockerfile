
# Usa una imagen base de Node.js
FROM node:20-slim

# Instala herramientas necesarias para compilar better-sqlite3 si es necesario
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Establece el directorio de trabajo
WORKDIR /app

# Copia los archivos de configuración de npm
COPY package*.json ./

# Instala las dependencias
RUN npm install

# Copia el resto de los archivos
COPY . .

# Construye la aplicación frontend
RUN npm run build

# Expone el puerto 3000
EXPOSE 3000

# Define la variable de entorno para producción
ENV NODE_ENV=production

# Comando para iniciar la aplicación
CMD ["npm", "run", "dev"]
