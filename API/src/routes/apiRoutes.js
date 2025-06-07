import express from 'express';
const router = express.Router();

import * as UserController from '../controllers/UserController.js';
import * as MovieController from '../controllers/MovieController.js';
import * as ScreeningController from '../controllers/ScreeningController.js';
import { authenticateToken } from '../middleware/validation.js';
import * as ManagerController from '../controllers/ManagerController.js';
import * as ReservationController from '../controllers/ReservationController.js';
import * as HallController from '../controllers/HallController.js';


/////////////////////////////////////////////////////////////////
///////////////////////////// users /////////////////////////////
/////////////////////////////////////////////////////////////////


/**
 * @swagger
 * /api/register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: JohnDoe
 *               email:
 *                 type: string
 *                 example: johndoe@hotmail.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Bad request (missing or invalid fields)
 */
router.post('/register', UserController.registerUser); 

/**
 * @swagger
 * /api/login:
 *   post:
 *     summary: Login a user with username or email
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - usernameOrEmail
 *               - password
 *             properties:
 *               usernameOrEmail:
 *                 type: string
 *                 example: JohnDoe
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       401:
 *         description: Unauthorized (invalid credentials)
 */
router.post('/login', UserController.loginUser);

/**
 * @swagger
 * /api/getAllUsers:
 *   get:
 *     summary: Retrieve all users
 *     tags:
 *       - Users
 *     responses:
 *       200:
 *         description: A list of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   user_id:
 *                     type: integer
 *                     example: 1
 *                   username:
 *                     type: string
 *                     example: JohnDoe
 *                   email:
 *                     type: string
 *                     example: johndoe@hotmail.com
 *                   role:
 *                     type: string
 *                     example: user
 *       500:
 *         description: Internal server error
 */
router.get('/getAllUsers', UserController.getAllUsers);

/**
 * @swagger
 * /api/getUserBy/{param}/{value}:
 *   get:
 *     summary: Retrieve a user by a specific parameter and value
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: param
 *         required: true
 *         schema:
 *           type: string
 *         description: The column name to search by (e.g., "username", "user_id")
 *       - in: path
 *         name: value
 *         required: true
 *         schema:
 *           type: string
 *         description: The value to search for in the specified column
 *     responses:
 *       200:
 *         description: A user matching the specified parameter and value
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user_id:
 *                   type: integer
 *                   example: 1
 *                 username:
 *                   type: string
 *                   example: JohnDoe
 *                 email:
 *                   type: string
 *                   example: johndoe@hotmail.com
 *                 role:
 *                   type: string
 *                   example: user
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/getUserBy/:param/:value', UserController.getUserBy); 

/**
 * @swagger
 * /api/deleteUser/{user_id}:
 *   delete:
 *     summary: Delete a user by user_ID
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the user to delete
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.delete('/deleteUser/:user_id', UserController.deleteUser);

/**
 * @swagger
 * /api/me:
 *   get:
 *     summary: Get the currently authenticated user's info
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved user info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user_id:
 *                   type: integer
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *       401:
 *         description: Unauthorized – missing or invalid token
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/me', authenticateToken, UserController.getMe);


/////////////////////////////////////////////////////////////////
//////////////////////////// manager ////////////////////////////
/////////////////////////////////////////////////////////////////

/**
 * @swagger
 * /api/changeUserRole:
 *   post:
 *     summary: Change a user's role
 *     tags:
 *       - Manager
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - new_role
 *             properties:
 *               user_id:
 *                 type: integer
 *                 example: 1
 *               new_role:
 *                 type: string
 *                 example: manager
 *     responses:
 *       200:
 *         description: User role updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: User not found
 */
router.post('/changeUserRole', ManagerController.changeUserRole);


/////////////////////////////////////////////////////////////////
///////////////////////////// tmdb //////////////////////////////
/////////////////////////////////////////////////////////////////

/**
 * @swagger
 * /api/movies/tmdb:
 *   get:
 *     summary: Get movies from TMDB
 *     tags:
 *       - TMDB
 *     responses:
 *       200:
 *         description: List of movies from TMDB
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   adult:
 *                     type: boolean
 *                   backdrop_path:
 *                     type: string
 *                   genre_ids:
 *                     type: array
 *                     items:
 *                       type: integer
 *                   id:
 *                     type: integer
 *                   original_language:
 *                     type: string
 *                   original_title:
 *                     type: string
 *                   overview:
 *                     type: string
 *                   popularity:
 *                     type: number
 *                   poster_path:
 *                     type: string
 *                   release_date:
 *                     type: string
 *                     format: date
 *                   title:
 *                     type: string
 *                   video:
 *                     type: boolean
 *                   vote_average:
 *                     type: number
 *                   vote_count:
 *                     type: integer
 *                   poster_url:
 *                     type: string
 *             example:
 *               - adult: false
 *                 backdrop_path: "/7Zx3wDG5bBtcfk8lcnCWDOLM4Y4.jpg"
 *                 genre_ids: [10751, 35, 878]
 *                 id: 552524
 *                 original_language: "en"
 *                 original_title: "Lilo & Stitch"
 *                 overview: "The wildly funny and touching story of a lonely Hawaiian girl and the fugitive alien who helps to mend her broken family."
 *                 popularity: 554.7778
 *                 poster_path: "/tUae3mefrDVTgm5mRzqWnZK6fOP.jpg"
 *                 release_date: "2025-05-17"
 *                 title: "Lilo & Stitch"
 *                 video: false
 *                 vote_average: 7.1
 *                 vote_count: 500
 *                 poster_url: "https://image.tmdb.org/t/p/w500/tUae3mefrDVTgm5mRzqWnZK6fOP.jpg"
 *       500:
 *         description: Failed to fetch movies from TMDB
 */

router.get('/movies/tmdb', MovieController.getMoviesTMDB); // Changed from getMovies to getMoviesTMDB

/**
 * @swagger
 * /api/movies/tmdb/search:
 *   get:
 *     summary: Search movies from TMDB
 *     tags:
 *       - TMDB
 *     parameters:
 *       - in: query
 *         name: title
 *         required: true
 *         schema:
 *           type: string
 *         description: The search query for the movie title
 *     responses:
 *       200:
 *         description: Search results from TMDB
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   adult:
 *                     type: boolean
 *                   backdrop_path:
 *                     type: string
 *                     nullable: true
 *                   genre_ids:
 *                     type: array
 *                     items:
 *                       type: integer
 *                   id:
 *                     type: integer
 *                   original_language:
 *                     type: string
 *                   original_title:
 *                     type: string
 *                   overview:
 *                     type: string
 *                   popularity:
 *                     type: number
 *                     format: float
 *                   poster_path:
 *                     type: string
 *                     nullable: true
 *                   release_date:
 *                     type: string
 *                     format: date
 *                   title:
 *                     type: string
 *                   video:
 *                     type: boolean
 *                   vote_average:
 *                     type: number
 *                     format: float
 *                   vote_count:
 *                     type: integer
 *                   poster_url:
 *                     type: string
 *       400:
 *         description: Missing or invalid query parameter
 *       500:
 *         description: Failed to search movies from TMDB
 */

router.get('/movies/tmdb/search', MovieController.searchMoviesTMDB); // Changed from searchMovies to searchMoviesTMDB

/**
 * @swagger
 * /api/movies/tmdb/genres:
 *   get:
 *     summary: Get movie genres from TMDB
 *     tags:
 *       - TMDB
 *     responses:
 *       200:
 *         description: List of movie genres from TMDB
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Failed to fetch genres from TMDB
 */
router.get('/movies/tmdb/genres', MovieController.getTMDBGenres);

/**
 * @swagger
 * /api/movies/tmdb/{id}/videos:
 *   get:
 *     summary: Get videos (trailers, teasers, etc.) for a movie from TMDB by ID
 *     tags:
 *       - TMDB
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The TMDB movie ID
 *     responses:
 *       200:
 *         description: List of videos for the movie from TMDB
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       404:
 *         description: Movie or videos not found on TMDB
 *       500:
 *         description: Failed to fetch videos from TMDB
 */
router.get('/movies/tmdb/:id/videos', MovieController.getMovieVideosTMDB); // Changed from getMovieVideos to getMovieVideosTMDB

/**
 * @swagger
 * /api/movies/tmdb/{id}:
 *   get:
 *     summary: Get movie details from TMDB by ID
 *     tags:
 *       - TMDB
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The TMDB movie ID
 *     responses:
 *       200:
 *         description: Movie details from TMDB
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Movie not found on TMDB
 *       500:
 *         description: Failed to fetch movie details from TMDB
 */
router.get('/movies/tmdb/:id', MovieController.getMovieDetailsTMDB); // Changed from getMovieDetails to getMovieDetailsTMDB

/**
 * @swagger
 * /api/movies/details/{title}:
 *   get:
 *     summary: Get movie details from TMDB by title
 *     tags:
 *       - TMDB
 *     parameters:
 *       - in: path
 *         name: title
 *         required: true
 *         schema:
 *           type: string
 *         description: The title of the movie to search for
 *     responses:
 *       200:
 *         description: Movie details from TMDB
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Movie not found on TMDB
 *       500:
 *         description: Failed to fetch movie details from TMDB
 */
router.get('/movies/details/:title', MovieController.getMovieByTitleTMDB); // Changed from getMovieByTitle to getMovieByTitleTMDB

/////////////////////////////////////////////////////////////////
///////////////////////////// movies ////////////////////////////
/////////////////////////////////////////////////////////////////

/**
 * @swagger
 * /api/movies:
 *   get:
 *     summary: Get all movies
 *     tags:
 *       - Movies
 *     responses:
 *       200:
 *         description: List of movies
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   movie_id:
 *                     type: integer
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   release_date:
 *                     type: string
 *                     format: date
 *                   duration:
 *                     type: integer
 *                   genre:
 *                     type: string
 */
router.get('/movies', MovieController.getAllMovies);

/**
 * @swagger
 * /api/movies/{id}:
 *   get:
 *     summary: Get movie details by ID
 *     tags:
 *       - Movies
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the movie
 *     responses:
 *       200:
 *         description: Movie details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 movie_id:
 *                   type: integer
 *                 title:
 *                   type: string
 *                 description:
 *                   type: string
 *                 release_date:
 *                   type: string
 *                   format: date
 *                 duration:
 *                   type: integer
 *                 genre:
 *                   type: string
 *       404:
 *         description: Movie not found
 */
router.get('/movies/:id', MovieController.getMovieById);

/**
 * @swagger
 * /api/movies:
 *   post:
 *     summary: Add a new movie
 *     tags:
 *       - Movies
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - release_date
 *               - duration
 *               - genre
 *             properties:
 *               title:
 *                 type: string
 *                 example: Inception
 *               description:
 *                 type: string
 *                 example: A mind-bending thriller
 *               release_date:
 *                 type: string
 *                 format: date
 *                 example: 2010-07-16
 *               duration:
 *                 type: integer
 *                 example: 148
 *               genre:
 *                 type: string
 *                 example: Sci-Fi
 *     responses:
 *       201:
 *         description: Movie added successfully
 *       400:
 *         description: Bad request
 */
router.post('/movies', MovieController.addMovie);

/**
 * @swagger
 * /api/movies/{id}:
 *   patch:
 *     summary: Edit a movie by ID
 *     tags:
 *       - Movies
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the movie to edit
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Inception
 *               description:
 *                 type: string
 *                 example: A mind-bending thriller
 *               release_date:
 *                 type: string
 *                 format: date
 *                 example: 2010-07-16
 *               duration:
 *                 type: integer
 *                 example: 148
 *               genre:
 *                 type: string
 *                 example: Sci-Fi
 *     responses:
 *       200:
 *         description: Movie updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Movie not found
 */
router.patch('/movies/:id', MovieController.editMovie);

/**
 * @swagger
 * /api/movies/{id}:
 *   delete:
 *     summary: Delete a movie by ID
 *     tags:
 *       - Movies
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the movie to delete
 *     responses:
 *       200:
 *         description: Movie deleted successfully
 *       404:
 *         description: Movie not found
 */
router.delete('/movies/:id', MovieController.deleteMovie);


/////////////////////////////////////////////////////////////////
/////////////////////////// screenings //////////////////////////
/////////////////////////////////////////////////////////////////

/**
 * @swagger
 * /api/screenings:
 *   get:
 *     summary: Get all screenings
 *     tags:
 *       - Screenings
 *     responses:
 *       200:
 *         description: List of screenings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   screening_id:
 *                     type: integer
 *                   movie_id:
 *                     type: integer
 *                   hall_id:
 *                     type: integer
 *                   start_time:
 *                     type: string
 *                     format: date-time
 *                   end_time:
 *                     type: string
 *                     format: date-time
 */
router.get('/screenings', ScreeningController.getAllScreenings);

/**
 * @swagger
 * /api/screenings/{id}:
 *   get:
 *     summary: Get screening details by ID
 *     tags:
 *       - Screenings
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the screening
 *     responses:
 *       200:
 *         description: Screening details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 screening_id:
 *                   type: integer
 *                 movie_id:
 *                   type: integer
 *                 hall_id:
 *                   type: integer
 *                 start_time:
 *                   type: string
 *                   format: date-time
 *                 end_time:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Screening not found
 */
router.get('/screenings/:id', ScreeningController.getScreeningById);

/**
 * @swagger
 * /api/screenings:
 *   post:
 *     summary: Create a new screening
 *     tags:
 *       - Screenings
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - movie_id
 *               - hall_id
 *               - start_time
 *               - end_time
 *             properties:
 *               movie_id:
 *                 type: integer
 *               hall_id:
 *                 type: integer
 *               start_time:
 *                 type: string
 *                 format: date-time
 *               end_time:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Screening created successfully
 *       400:
 *         description: Bad request
 */
router.post('/screenings', ScreeningController.createScreenings);

/**
 * @swagger
 * /api/screenings/{id}:
 *   patch:
 *     summary: Update a screening by ID
 *     tags:
 *       - Screenings
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the screening to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               movie_id:
 *                 type: integer
 *               hall_id:
 *                 type: integer
 *               start_time:
 *                 type: string
 *                 format: date-time
 *               end_time:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Screening updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Screening not found
 */
router.patch('/screenings/:id', ScreeningController.updateScreenings);

/**
 * @swagger
 * /api/screenings/{id}:
 *   delete:
 *     summary: Delete a screening by ID
 *     tags:
 *       - Screenings
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the screening to delete
 *     responses:
 *       200:
 *         description: Screening deleted successfully
 *       404:
 *         description: Screening not found
 */
router.delete('/screenings/:id', ScreeningController.deleteScreenings);

/////////////////////////////////////////////////////////////////
/////////////////////// reservations ////////////////////////////
/////////////////////////////////////////////////////////////////

/**
 * @swagger
 * /api/screenings/{id}/tickets:
 *   get:
 *     summary: Get seat availability for a screening
 *     tags:
 *       - Reservations
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Screening ID
 *     responses:
 *       200:
 *         description: List of all seats and their availability
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   seat_id:
 *                     type: integer
 *                   row:
 *                     type: integer
 *                   number:
 *                     type: integer
 *                   is_reserved:
 *                     type: boolean
 */
router.get('/screenings/:id/tickets', ReservationController.getTicketsForScreening);

/**
 * @swagger
 * /api/my-reservations:
 *   get:
 *     summary: Get all reservations for the logged-in user
 *     tags:
 *       - Reservations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of reservations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   reservation_id:
 *                     type: integer
 *                   screening_id:
 *                     type: integer
 *                   seat_id:
 *                     type: integer
 *                   reserved_at:
 *                     type: string
 *                     format: date-time
 */
router.get('/my-reservations', authenticateToken, ReservationController.getMyReservations);

/**
 * @swagger
 * /api/reserve:
 *   post:
 *     summary: Reserve tickets for a screening
 *     tags:
 *       - Reservations
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - screening_id
 *               - seat_ids
 *             properties:
 *               screening_id:
 *                 type: integer
 *               seat_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       201:
 *         description: Tickets reserved successfully
 *       409:
 *         description: One or more seats already reserved
 *       400:
 *         description: Bad request
 */
router.post('/reserve', authenticateToken, ReservationController.reserveTickets);

/**
 * @swagger
 * /api/users/{id}/reservations:
 *   get:
 *     summary: Get all reservations for a specific user (manager only)
 *     tags:
 *       - Reservations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The user ID to fetch reservations for
 *     responses:
 *       200:
 *         description: List of reservations for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   reservation_id:
 *                     type: integer
 *                   screening_id:
 *                     type: integer
 *                   seat_id:
 *                     type: integer
 *                   seat_row:
 *                     type: string
 *                   seat_number:
 *                     type: string
 *                   start_time:
 *                     type: string
 *                     format: date-time
 *                   movie_title:
 *                     type: string
 *                   hall_name:
 *                     type: string
 *                   reservation_time:
 *                     type: string
 *                     format: date-time
 *       403:
 *         description: Forbidden - Only managers can access this endpoint
 *       500:
 *         description: Internal server error
 */
router.get('/users/:id/reservations', ReservationController.getReservationsForUser);


/////////////////////////////////////////////////////////////////
/////////////////////////// Halls ///////////////////////////////
/////////////////////////////////////////////////////////////////

/**
 * @swagger
 * /api/halls:
 *   get:
 *     summary: Get all halls
 *     tags:
 *       - Halls
 *     responses:
 *       200:
 *         description: List of all halls
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   hall_id:
 *                     type: integer
 *                     example: 1
 *                   name:
 *                     type: string
 *                     example: Main Hall
 *                   total_seats:
 *                     type: integer
 *                     example: 50
 *       500:
 *         description: Failed to fetch halls
 */
router.get('/halls', HallController.getAllHalls);

export default router;