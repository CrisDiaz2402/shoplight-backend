# 1. Usar una imagen base de Node.js ligera
FROM node:20-alpine

# 2. Crear directorio de trabajo dentro del contenedor
WORKDIR /app

# 3. Copiar archivos de dependencias y configuración
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
COPY tsconfig.json ./

# 4. Instalar dependencias (SIN ejecutar scripts postinstall)
# Esto evita que 'prisma generate' falle por falta de DATABASE_URL
RUN npm install --ignore-scripts

# 5. Copiar el resto del código fuente
COPY . .

# 6. Generar el cliente de Prisma (Manualmente)
# Aquí SÍ necesitamos que funcione, pero como es build-time,
# Prisma se quejará si no ve la variable.
# TRUCO: Le damos una URL falsa solo para que genere los tipos.
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

# 7. Compilar el proyecto TypeScript
RUN npm run build

# 8. Exponer el puerto
EXPOSE 3000

# 9. Comando de arranque
CMD ["npm", "start"]