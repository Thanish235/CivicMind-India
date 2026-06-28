# Use official Python lightweight image
FROM python:3.13-slim

# Set environment system variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080

# Set workspace directory
WORKDIR /app

# Install system dependencies needed for compiling xgboost/lightgbm
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose target port
EXPOSE 8080

# Command to run server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
