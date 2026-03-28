FROM node:22-alpine

RUN apk add --no-cache curl

# Install deps on startup so node_modules stay on the host-mounted volume
# (enables hot reload without rebuilding the image).
WORKDIR /workspace
CMD ["sh", "-c", "cd /workspace/ui && npm install --legacy-peer-deps && npm run dev -- --host"]

EXPOSE 5173
