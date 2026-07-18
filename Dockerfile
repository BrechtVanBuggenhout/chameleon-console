# Multi-stage build producing a minimal runtime image for Cloud Run, using
# Next.js's standalone output (see next.config.ts). Two stages: build (full
# node_modules + toolchain) and runtime (only the standalone bundle).

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
# The build needs *a* value for every required env var read at build time
# (e.g. Resend's client is constructed eagerly — see app/api/contact/route.ts);
# real values are supplied at runtime by Cloud Run, not baked into the image.
ENV RESEND_API_KEY=re_build_placeholder
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

# Cloud Run injects $PORT; Next's standalone server.js honors it directly.
EXPOSE 8080
CMD ["node", "server.js"]
