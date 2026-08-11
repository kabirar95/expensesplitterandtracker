# ============================================================
# FRONTEND DOCKERFILE
# ============================================================
# Builds and serves the React + Vite frontend in development.
# ============================================================

FROM node:20-slim

WORKDIR /app

# Copy package files first (Docker caches this layer)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the code
COPY . .

# Expose Vite's dev server port
EXPOSE 5173

# Run Vite dev server
# --host 0.0.0.0 = accessible from outside the container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
