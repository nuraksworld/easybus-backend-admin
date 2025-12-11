# syntax=docker/dockerfile:1

# ---- deps layer ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Install only prod deps; change to `npm ci` if you use package-lock.json
RUN npm ci --omit=dev

# ---- runtime ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# Change if your app reads PORT from env
ENV PORT=8080

# Run as non-root
USER node

# Bring node_modules from deps layer
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
# Copy app source
COPY --chown=node:node . .

# Expose container port
EXPOSE 8080

# Change the entry if your entry file differs
CMD ["node", "src/server.js"]
