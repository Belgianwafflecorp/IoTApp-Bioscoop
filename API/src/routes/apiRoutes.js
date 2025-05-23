import express from 'express';
const router = express.Router();

import * as UserController from '../controllers/UserController.js';
import * as MovieController from '../controllers/MovieController.js';
import * as ScreeningController from '../controllers/ScreeningController.js';
import { authenticateToken } from '../middleware/validation.js';
import * as ManagerController from '../controllers/ManagerController.js';
import * as MovieTMDB from '../controllers/Movies.js';
import * as ReservationController from '../controllers/ReservationController.js';


/////////////////////////////////////////////////////////////////
///////////////////////////// users /////////////////////////////
/////////////////////////////////////////////////////////////////

/**
 * @swagger
 * /api/movies/tmdb:
 *   get:
 *     summary: Get movies from TMDB
 *     tags:
 *       - TMDB Movies
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
 *                   id:
 *                     type: integer
 *                     example: 123
 *                   title:
 *                     type: string
 *                     example: Inception
 *                   overview:
 *                     type: string
 *                     example: A mind-bending thriller...
 *                   release_date:
 *                     type: string
 *                     example: 2010-07-16
 *       500:
 *         description: Internal server error
 */
router.get('/movies/tmdb', MovieTMDB.getMovies);

router.get('/movies/search', MovieTMDB.searchMovies);

/**
 * @swagger
 * /api/movies/tmdb/{id}:
 *   get:
 *     summary: Get TMDB movie details by ID
 *     tags:
 *       - TMDB Movies
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The TMDB movie ID
 *     responses:
 *       200:
 *         description: TMDB movie details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 123
 *                 title:
 *                   type: string
 *                   example: Inception
 *                 overview:
 *                   type: string
 *                   example: A mind-bending thriller...
 *                 release_date:
 *                   type: string
 *                   example: 2010-07-16
 *       404:
 *         description: Movie not found
 *       500:
 *         description: Internal server error
 */
router.get('/movies/:id', MovieTMDB.getMovieDetails);

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
 *       200:
 *         description: User registered successfully
 *       400:
 *         description: Bad request
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
 *             properties:
 *               usernameOrEmail:
 *                 type: string
 *                 example: JohnDoe
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Unauthorized
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

router.get('/me', authenticateToken, UserController.getMe);
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
 *                 username:
 *                   type: string
 *       401:
 *         description: Unauthorized – missing or invalid token
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */


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
 *             properties:
 *               user_id:
 *                 type: integer
 *                 example: 1
 *               new_role:
 *                 type: string
 *                 example: manager
 */
router.post('/changeUserRole', ManagerController.changeUserRole);



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
 *     responses:
 *       200:
 *         description: Movie details
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
 *   put:
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
router.put('/movies/:id', MovieController.editMovie);

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
 */
router.get('/screenings', ScreeningController.getAllScreenings);

router.get('/screenings/:id', ScreeningController.getScreeningById);
/**
 * @swagger
 * /api/screenings/{id}:
 *   get:
 *     summary: Get screening details by ID
 *     tags:
 *       - Screenings
 */

/**
 * @swagger
 * /api/screenings:
 *   post:
 *     summary: Create a new screening
 *     tags:
 *       - Screenings
 */
router.post('/screenings', ScreeningController.createScreenings);

/**
 * @swagger
 * /api/screenings/{id}:
 *   put:
 *     summary: Update a screening by ID
 *     tags:
 *       - Screenings
 */
router.put('/screenings/:id', ScreeningController.updateScreenings);

/**
 * @swagger
 * /api/screenings/{id}:
 *   delete:
 *     summary: Delete a screening by ID
 *     tags:
 *       - Screenings
 */
router.delete('/screenings/:id', ScreeningController.deleteScreenings);

/////////////////////////////////////////////////////////////////
/////////////////////// reservations ////////////////////////////
/////////////////////////////////////////////////////////////////

// GET available tickets for a screening
router.get('/screenings/:id/tickets', ReservationController.getTicketsForScreening);

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
 */


// POST reserve seats
router.post('/reserve', authenticateToken, ReservationController.reserveTickets);


router.get('/my-reservations', authenticateToken, ReservationController.getMyReservations);
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
 */

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
 *             properties:
 *               user_id:
 *                 type: integer
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
 */


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
 *             properties:
 *               user_id:
 *                 type: integer
 *                 example: 1
 *               new_role:
 *                 type: string
 *                 example: manager
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
 *       500:
 *         description: Failed to fetch movies from TMDB
 */
router.get('/movies/tmdb', MovieTMDB.getMovies);

/**
 * @swagger
 * /api/movies/tmdb/search:
 *   get:
 *     summary: Search movies from TMDB
 *     tags:
 *       - TMDB
 *     parameters:
 *       - in: query
 *         name: query
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
 *       400:
 *         description: Missing or invalid query parameter
 *       500:
 *         description: Failed to search movies from TMDB
 */
router.get('/movies/tmdb/search', MovieTMDB.searchMovies);

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
router.get('/movies/tmdb/:id', MovieTMDB.getMovieDetails);

export default router;