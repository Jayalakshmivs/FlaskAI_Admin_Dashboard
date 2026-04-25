# -------- BUILD STAGE --------
FROM node:20-alpine AS build-stage

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

# ✅ safer env handling
ARG VITE_API_URL=http://backend:8000
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build


# -------- PRODUCTION --------
FROM node:20-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=build-stage /app/dist /app/dist

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
