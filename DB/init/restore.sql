-- Create the database outside any transaction for compatibility
CREATE DATABASE IF NOT EXISTS cinema;
USE cinema;

-- Create user and grant access (outside transaction)
CREATE USER IF NOT EXISTS 'webuser'@'%' IDENTIFIED BY 'webuserPass';
GRANT ALL PRIVILEGES ON cinema.* TO 'webuser'@'%';
FLUSH PRIVILEGES;

-- Now start your transactional schema and data init
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
    FOREIGN KEY (hall_id) REFERENCES halls(hall_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE showings (
    showing_id INT PRIMARY KEY AUTO_INCREMENT,
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
    password_hash VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE reservations (
    reservation_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    showing_id INT NOT NULL,
    seat_id INT NOT NULL,
    reservation_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (showing_id) REFERENCES showings(showing_id) ON DELETE CASCADE,
    FOREIGN KEY (seat_id) REFERENCES seats(seat_id) ON DELETE CASCADE,
    UNIQUE (showing_id, seat_id)
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
INSERT INTO seats (hall_id, seat_row, seat_number) VALUES
(1, 'A', 1), (1, 'A', 2), (1, 'A', 3), (1, 'A', 4), (1, 'A', 5),
(1, 'B', 1), (1, 'B', 2), (1, 'B', 3), (1, 'B', 4), (1, 'B', 5),
(1, 'C', 1), (1, 'C', 2), (1, 'C', 3), (1, 'C', 4), (1, 'C', 5);

-- Seats (VIP Lounge: row A, seats 1-4)
INSERT INTO seats (hall_id, seat_row, seat_number) VALUES
(2, 'A', 1), (2, 'A', 2), (2, 'A', 3), (2, 'A', 4);

-- Showings
INSERT INTO showings (movie_id, hall_id, start_time) VALUES
(1, 1, '2025-05-05 18:00:00'),
(2, 1, '2025-05-05 21:00:00'),
(3, 2, '2025-05-06 20:00:00');

-- Users
INSERT INTO users (username, email, password_hash) VALUES
('alice', 'alice@example.com', 'hashed_pw_1'),
('bob', 'bob@example.com', 'hashed_pw_2');

-- Reservations
INSERT INTO reservations (user_id, showing_id, seat_id) VALUES
(1, 1, 1),  -- Alice books seat A1 for Inception
(2, 1, 2),  -- Bob books seat A2 for Inception
(1, 3, 16); -- Alice books seat A4 in VIP for Interstellar

COMMIT;
