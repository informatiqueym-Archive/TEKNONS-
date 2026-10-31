# Teknons platform (core + accounting). No npm dependencies: Node's built-in SQLite.
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3100 HOST=0.0.0.0 DATA_DIR=/data
COPY . .
RUN mkdir -p /data && chown -R node:node /data
USER node
VOLUME /data
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://127.0.0.1:3100/api/health >/dev/null || exit 1
# SEED_DEMO=1 fills an empty database with the demo company (for test servers only)
CMD ["sh", "-c", "if [ \"$SEED_DEMO\" = \"1\" ]; then node --no-warnings scripts/seed-demo.mjs; fi; exec node --no-warnings server.mjs"]
