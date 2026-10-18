FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY . .
ENV NODE_ENV=production
USER node
EXPOSE 5000
CMD ["node","server.js"]
