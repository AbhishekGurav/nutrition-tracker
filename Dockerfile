FROM node:24-alpine AS build-env
COPY . /app/
WORKDIR /app
RUN npm ci
RUN npm run build

FROM nginx:alpine
COPY --from=build-env /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
