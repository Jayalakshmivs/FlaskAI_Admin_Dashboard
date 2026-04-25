# -------- BUILD STAGE --------
FROM node:20-alpine AS build-stage

WORKDIR /app

# Copy only package files first (for caching)
COPY package*.json ./

# ✅ SAFE INSTALL (works in Coolify)
RUN npm install --legacy-peer-deps

# Copy rest of the code
COPY . .

# Set API base
ENV VITE_API_URL=/api

# Build
RUN npm run build


# -------- PRODUCTION STAGE --------
FROM nginx:stable-alpine

RUN rm -rf /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build-stage /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
