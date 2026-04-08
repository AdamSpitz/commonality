FROM node:24-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY . .

RUN npm ci
RUN cd sdk && npm run build
RUN cd platform-api-service && npm run build

EXPOSE 3001

CMD ["node", "platform-api-service/dist/index.js"]
