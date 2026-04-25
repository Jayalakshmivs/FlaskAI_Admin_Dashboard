# -------- BUILD STAGE --------
FROM node:20-alpine AS build-stage

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

# ✅ FIX: direct backend URL (no nginx now)
ENV VITE_API_URL=http://backend:8000

RUN npm run build


# -------- PRODUCTION STAGE --------
FROM node:20-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=build-stage /app/dist /app/dist

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
