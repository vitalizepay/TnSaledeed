FROM node:20-alpine
WORKDIR /srv

# copy only manifests first to leverage layer cache
COPY package.json package-lock.json* ./

# If lock exists: use ci; otherwise fall back to install
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev; \
    else \
      npm install --omit=dev --no-audit --no-fund; \
    fi

COPY server.js .
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node","server.js"]
