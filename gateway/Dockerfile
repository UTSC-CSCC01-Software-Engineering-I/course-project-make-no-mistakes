FROM nginx:1.27-alpine

RUN apk add --no-cache openssl \
    && mkdir -p /etc/nginx/certs \
    && openssl req -x509 -nodes -newkey rsa:2048 -days 30 \
       -keyout /etc/nginx/certs/privkey.pem \
       -out /etc/nginx/certs/fullchain.pem \
       -subj "/CN=localhost"

COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80 443
