FROM node:20-alpine

WORKDIR /app

# Cache dependencies layer: only re-runs npm ci when package.json changes
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline

COPY . .

EXPOSE 4000
CMD ["node", "server.js"]
