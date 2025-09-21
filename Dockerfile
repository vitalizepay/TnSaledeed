# -------- 1) Build the React app --------
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# -------- 2) Serve with nginx --------
FROM nginx:alpine

# Copy custom nginx.conf (SPA + API proxy)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Ensure mime.types exists (some alpine variants remove it)
RUN test -f /etc/nginx/mime.types || \
    (echo "Installing nginx mime types..." && apk add --no-cache nginx-mod-http-headers-more)

# Copy freshly-built assets
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
