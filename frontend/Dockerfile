# -------- BUILD STAGE --------
FROM node:20-alpine AS build-stage

WORKDIR /app

# Install dependencies (better caching)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Set API base for production
ENV VITE_API_URL=/api

# Build
RUN npm run build


# -------- PRODUCTION STAGE --------
FROM nginx:stable-alpine

# Remove default nginx config (important)
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built frontend
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]