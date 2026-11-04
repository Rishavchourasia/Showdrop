# ---------------------------------------------------------------------------
# Stage 1: Node builds the React app into plain static files (dist/:
# index.html + JS + CSS). Stage 2: nginx serves those files. Node isn't needed
# at runtime because the browser runs the JavaScript, not the server.
# ---------------------------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
