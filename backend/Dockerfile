# ============================================================
# BACKEND DOCKERFILE
# ============================================================
# This file tells Docker how to build the backend container.
# Think of it as a recipe:
#   1. Start with Python 3.12
#   2. Copy our code into the container
#   3. Install dependencies
#   4. Run the FastAPI server
# ============================================================

# Use Python 3.12 slim image (smaller than the full image)
FROM python:3.12-slim

# Set the working directory inside the container
WORKDIR /app

# Copy requirements first (Docker caches this layer)
# If requirements.txt hasn't changed, Docker skips reinstalling
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose port 8000 (FastAPI's default port)
EXPOSE 8000

# Run the FastAPI server with uvicorn
# --host 0.0.0.0 = listen on all interfaces (needed for Docker)
# --port 8000 = the port to listen on
# --reload = auto-restart when code changes (development only!)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
