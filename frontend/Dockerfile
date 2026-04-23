# -------- BUILD STAGE --------
FROM node:20-alpine AS build-stage

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source
COPY . .

# Set API base (used by Vite)
ENV VITE_API_URL=/api

# Build frontend
RUN npm run build


# -------- PRODUCTION STAGE --------
FROM nginx:stable-alpine AS production-stage

# Copy built files
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy nginx config (IMPORTANT)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]