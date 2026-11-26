FROM node:26-alpine AS builder

RUN npm install --global pnpm@12.23.0

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG VITE_API_URL=
ENV VITE_API_URL=${VITE_API_URL}

RUN pnpm build

FROM nginxinc/nginx-unprivileged:alpine

ENV BE_UPSTREAM=webfp-be.webfp.svc.cluster.local

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/40-resolver-from-resolvconf.sh /docker-entrypoint.d/40-resolver-from-resolvconf.sh
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
	CMD wget -q -O /dev/null "http://127.0.0.1:8080/healthz" || exit 1
