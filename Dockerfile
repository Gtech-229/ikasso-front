# Production image of the Ikasso admin web (feature 18): Next.js standalone
# output, run by the unprivileged `node` user. Built and started by the
# backend's docker-compose.prod.yml (service `admin`, see README "Production").

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Next resolves rewrites() at build time: the /api/v1 proxy target is baked into
# the build, so the API's internal URL is needed here as well as at runtime.
ARG API_URL=http://api:3000
ENV API_URL=$API_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Read again at runtime by server-side fetches (lib/env.ts); the compose sets it.
ARG API_URL=http://api:3000
ENV API_URL=$API_URL
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
