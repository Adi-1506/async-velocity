FROM node:26-bookworm-slim@sha256:298992629d69bbd5b2b03ad57094d8e4fcb3a8eeb7c4e25d29de656519568913 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY . .
FROM gcr.io/distroless/nodejs22-debian13:nonroot@sha256:668bb45274f097b5b8b41e9825a9bbd3b5e5c44cec5c50c61fe2a1b6ce5f6ba6
WORKDIR /app
COPY --from=build --chown=65532:65532 /app ./
ENV NODE_ENV=production
EXPOSE 5000
CMD ["scripts/container-start.js"]
