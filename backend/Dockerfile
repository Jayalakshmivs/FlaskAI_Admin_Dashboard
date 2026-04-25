# -------- BUILD STAGE --------
FROM node:20-alpine AS build-stage

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source
COPY . .

# Set API base (same as before)
ENV VITE_API_URL=/api

# Build project
RUN npm run build


# -------- PRODUCTION STAGE (NO NGINX) --------
FROM node:20-alpine

WORKDIR /app

# Install static server
RUN npm install -g serve

# Copy build output
COPY --from=build-stage /app/dist /app/dist

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
