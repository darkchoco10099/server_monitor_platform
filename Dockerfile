# Dockerfile —— Nuxt 3 + better-sqlite3
FROM node:22-slim AS base
RUN apt-get update -y && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

FROM base AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM base AS release
WORKDIR /app
COPY --from=build /build/.output ./.output
COPY --from=build /build/node_modules ./node_modules
COPY --from=build /build/package.json ./
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
