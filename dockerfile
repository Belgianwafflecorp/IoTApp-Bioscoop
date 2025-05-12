# Use Ubuntu as the base image
FROM ubuntu:24.04

# Set environment variables
ENV NODE_VERSION=18
ENV NPM_VERSION=9
ENV PORT_BACKEND=3000
ENV PORT_FRONTEND=5000

RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js and npm
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g npm@$NPM_VERSION

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./
# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the ports
EXPOSE $PORT_BACKEND
EXPOSE $PORT_FRONTEND

# Start the application
CMD ["npm", "start"]



