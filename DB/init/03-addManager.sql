USE cinema;
-- add manager
INSERT INTO Users (username, password_hash, email, role)
VALUES ('manager', '$2b$10$q4ap1kUA5layH4N1WRZH9ubpz9oLS1n3pwW4vaq7hKdTlzUEqlQI2', 'manager@cinema.com', 'manager');