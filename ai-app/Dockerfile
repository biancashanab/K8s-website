FROM node:18 AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
ENV NODE_OPTIONS=--openssl-legacy-provider
RUN npm run build 

FROM nginx:alpine

COPY --from=build /app/dist/ai-app /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 90

CMD ["nginx", "-g", "daemon off;"]