FROM node:18 AS build

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
RUN npm install

# Copy application source
COPY . .

# Build production artifacts
ENV NODE_OPTIONS=--openssl-legacy-provider
RUN npm run build

# Production runtime stage
FROM nginx:alpine

# Copy compiled application
COPY --from=build /app/dist/ai-app /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 91
CMD ["nginx", "-g", "daemon off;"]
