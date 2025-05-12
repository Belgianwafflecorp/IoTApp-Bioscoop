# Use a lightweight web server
FROM nginx:alpine

# Set the build-time argument (used to pass API host if needed in future)
ARG FRONT_APP_API_HOST

# Copy static files to Nginx's default HTML directory
COPY . /usr/share/nginx/html

# Optional: expose port (already handled in docker-compose, but fine to include)
EXPOSE 80
