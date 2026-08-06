# syntax=docker/dockerfile:1.7
FROM node:24.14.1-alpine AS builder

WORKDIR /workspace/cause-assist
COPY cause-assist/package.json cause-assist/tsconfig.json ./
COPY cause-assist/src ./src
RUN npm install && npx tsc

FROM node:24.14.1-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /workspace/cause-assist /app
EXPOSE 3002
CMD ["node", "dist/index.js"]
