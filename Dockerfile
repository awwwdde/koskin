FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY backend/default-content.json ./backend/default-content.json
COPY public ./public
COPY next.config.ts tsconfig.json postcss.config.mjs ./
RUN npm run build

FROM python:3.12-slim-bookworm AS runner
RUN apt-get update && apt-get install -y --no-install-recommends curl libstdc++6 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system portfolio && useradd --system --gid portfolio portfolio
WORKDIR /app
COPY --from=builder /usr/local/bin/node /usr/local/bin/node
ENV APP_ENV=production NODE_ENV=production PYTHONUNBUFFERED=1 PORT=8080 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY --from=builder --chown=portfolio:portfolio /app/.next/standalone ./
COPY --from=builder --chown=portfolio:portfolio /app/.next/static ./.next/static
COPY --from=builder --chown=portfolio:portfolio /app/public ./public
COPY --chown=portfolio:portfolio backend ./backend
COPY --chown=portfolio:portfolio alembic.ini ./
COPY --chown=portfolio:portfolio scripts/serve.py ./scripts/serve.py
USER portfolio
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 CMD curl -fsS http://localhost:8080/healthz || exit 1
CMD ["python", "scripts/serve.py"]
