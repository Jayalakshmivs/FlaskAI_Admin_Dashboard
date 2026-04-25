# -------- BUILD STAGE --------
FROM node:20-alpine AS build-stage

WORKDIR /app

# Install dependencies (with proper caching)
COPY package.json package-lock.json* ./

# Use npm ci if lockfile exists, else fallback
RUN if [ -f package-lock.json ]; then npm ci; else npm install --legacy-peer-deps; fi

# Copy source
COPY . .

# Set API base for production (used at build time)
ENV VITE_API_URL=/api

# Build app
RUN npm run build


# -------- PRODUCTION STAGE --------
FROM nginx:stable-alpine

# Remove default config
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
