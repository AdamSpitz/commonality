FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./
COPY sdk/package*.json ./sdk/
COPY sdk/ ./sdk/
COPY platform-api-service/package*.json ./platform-api-service/
COPY platform-api-service/ ./platform-api-service/

RUN npm ci
RUN cd sdk && npm run build
RUN cd platform-api-service && npm run build

EXPOSE 3001

CMD ["node", "platform-api-service/dist/index.js"]
