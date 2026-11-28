# BoliHisab: builds the frontend and serves it plus the voice API from one container.
FROM node:24-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server ./server
# The platform sets PORT; the server then listens on 0.0.0.0 and serves ./dist.
ENV PORT=8787
EXPOSE 8787
CMD ["npx", "tsx", "server/index.ts"]
