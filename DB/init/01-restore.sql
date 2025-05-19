-- Create the database outside the transaction for compatibility
CREATE DATABASE IF NOT EXISTS cinema;
USE cinema;

START TRANSACTION;

CREATE TABLE movies (
  movie_id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(100) NOT NULL,
  duration_minutes INT NOT NULL,
  genre VARCHAR(50),
  description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE halls (
  hall_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  total_seats INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE seats (
  seat_id INT PRIMARY KEY AUTO_INCREMENT,
  hall_id INT NOT NULL,
  seat_row CHAR(1) NOT NULL,
  seat_number INT NOT NULL,
  seat_type ENUM('reduced', 'normal', 'premium') NOT NULL,
  FOREIGN KEY (hall_id) REFERENCES halls(hall_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE screenings (
  screening_id INT PRIMARY KEY AUTO_INCREMENT,
  movie_id INT NOT NULL,
  hall_id INT NOT NULL,
  start_time DATETIME NOT NULL,
  FOREIGN KEY (movie_id) REFERENCES movies(movie_id) ON DELETE CASCADE,
  FOREIGN KEY (hall_id) REFERENCES halls(hall_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100),
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'manager') NOT NULL DEFAULT 'user'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE reservations (
  reservation_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  screening_id INT NOT NULL,
  seat_id INT NOT NULL,
  reservation_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (screening_id) REFERENCES screenings(screening_id) ON DELETE CASCADE,
  FOREIGN KEY (seat_id) REFERENCES seats(seat_id) ON DELETE CASCADE,
  UNIQUE (screening_id, seat_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dummy Data

-- Movies
INSERT INTO movies (title, duration_minutes, genre, description) VALUES
('Inception', 148, 'Sci-Fi', 'A thief steals corporate secrets through dream-sharing.'),
('The Godfather', 175, 'Crime', 'Mafia family drama.'),
('Interstellar', 169, 'Sci-Fi', 'Space travel to save humanity.');

-- Halls
INSERT INTO halls (name, total_seats) VALUES
('Main Hall', 50),
('VIP Lounge', 20);

-- Seats (Main Hall: A-C rows, seats 1-5)
INSERT INTO seats (hall_id, seat_row, seat_number, seat_type) VALUES
(1, 'A', 1, 'normal'), (1, 'A', 2, 'normal'), (1, 'A', 3, 'normal'),
(1, 'A', 4, 'normal'), (1, 'A', 5, 'normal'),
(1, 'B', 1, 'reduced'), (1, 'B', 2, 'reduced'), (1, 'B', 3, 'reduced'),
(1, 'B', 4, 'reduced'), (1, 'B', 5, 'reduced'),
(1, 'C', 1, 'premium'), (1, 'C', 2, 'premium'), (1, 'C', 3, 'premium'),
(1, 'C', 4, 'premium'), (1, 'C', 5, 'premium');


-- Seats (VIP Lounge: row A, seats 1-4)
INSERT INTO seats (hall_id, seat_row, seat_number, seat_type) VALUES
(2, 'A', 1, 'premium'), (2, 'A', 2, 'premium'),
(2, 'A', 3, 'premium'), (2, 'A', 4, 'premium');

-- Screenings
INSERT INTO screenings (movie_id, hall_id, start_time) VALUES
(1, 1, '2025-05-05 18:00:00'),
(2, 1, '2025-05-05 21:00:00'),
(3, 2, '2025-05-06 20:00:00');

-- Users
INSERT INTO users (username, email, password_hash, role) VALUES
('alice', 'alice@example.com', '$2b$10$examplehashforalice...', 'user'),
('bob', 'bob@example.com', '$2b$10$examplehashforbob...', 'manager');

-- Reservations
INSERT INTO reservations (user_id, screening_id, seat_id) VALUES
(1, 1, 1),  -- Alice books seat A1 for Inception
(2, 1, 2),  -- Bob books seat A2 for Inception
(1, 3, 16); -- Alice books seat A4 in VIP for Interstellar

COMMIT;
