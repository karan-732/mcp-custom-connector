FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json .
RUN npm ci --only=production && npm cache clean --force

FROM node:20-alpine
WORKDIR /app
RUN addgroup -S mcp && adduser -S mcp -G mcp
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN chown -R mcp:mcp /app
USER mcp
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
CMD ["node", "server.js"]
