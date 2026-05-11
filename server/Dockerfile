FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p /app/uploads; chown -R node:node /app
USER node
EXPOSE 8080
CMD ["node", "src/server.js"]
