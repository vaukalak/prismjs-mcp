FROM node:20-alpine AS base
WORKDIR /app

# Install deps
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci --no-audit --no-fund

# Build
COPY src ./src
RUN npm run build

# Runtime image
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist

# Default command for MCP stdio
CMD ["node", "dist/server.js"]


