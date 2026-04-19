FROM node:24-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
COPY sdk/package.json ./sdk/package.json
COPY platform-api-service/package.json ./platform-api-service/package.json
RUN npm ci
COPY sdk ./sdk
COPY platform-api-service ./platform-api-service
RUN npm run build --workspace=@commonality/sdk
RUN npm run build --workspace=@commonality/platform-api-service

EXPOSE 3001

CMD ["node", "platform-api-service/dist/index.js"]
