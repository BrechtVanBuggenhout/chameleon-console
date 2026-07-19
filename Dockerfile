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

# Refresh Alpine packages so OS-level CVEs (e.g. OpenSSL) fixed since this
# base image tag was published are picked up at build time, not frozen.
RUN apk update && apk upgrade --no-cache

# The running app is `node server.js` (Next's standalone output) -- npm is
# never invoked at runtime, but the node:20-alpine base image ships it
# anyway, bundled with its own vendored tar/glob/minimatch/cross-spawn/
# sigstore. Those get periodically flagged by vulnerability scans despite
# being completely unreachable code paths in this image. Strip npm (and
# corepack, same story) from the runtime stage only -- the build stage
# above still has and uses its own copy for `npm ci`/`npm run build`.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

# Cloud Run injects $PORT; Next's standalone server.js honors it directly.
EXPOSE 8080
CMD ["node", "server.js"]
