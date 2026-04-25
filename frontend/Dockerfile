# -------- BUILD STAGE --------
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

ENV VITE_API_URL=/api

RUN npm run build


# -------- PRODUCTION STAGE --------
FROM nginx:alpine

# Remove default config
RUN rm -f /etc/nginx/conf.d/default.conf

# ✅ Inline nginx config (no external file needed)
RUN printf '%s\n' \
'server {' \
'  listen 80;' \
'  server_name _;' \
'' \
'  root /usr/share/nginx/html;' \
'  index index.html;' \
'' \
'  location / {' \
'    try_files $uri $uri/ /index.html;' \
'  }' \
'' \
'  location /api/ {' \
'    proxy_pass http://backend:8000/;' \
'    proxy_http_version 1.1;' \
'    proxy_set_header Host $host;' \
'    proxy_set_header X-Real-IP $remote_addr;' \
'    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;' \
'    proxy_set_header X-Forwarded-Proto $scheme;' \
'  }' \
'' \
'  gzip on;' \
'  gzip_types text/plain text/css application/json application/javascript;' \
'}' \
> /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
