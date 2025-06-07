import express from 'express';
const router = express.Router();

import * as UserController from '../controllers/UserController.js';
import * as MovieController from '../controllers/MovieController.js'; // This now includes all movie logic
import * as ScreeningController from '../controllers/ScreeningController.js';
import { authenticateToken } from '../middleware/validation.js';
import * as ManagerController from '../controllers/ManagerController.js';
// import * as MovieTMDB from '../controllers/Movies.js'; // Remove this line
import * as ReservationController from '../controllers/ReservationController.js';
import * as HallController from '../controllers/HallController.js';


/////////////////////////////////////////////////////////////////
///////////////////////////// users /////////////////////////////
/////////////////////////////////////////////////////////////////


/**
 * @swagger
 * /api/register:
 * post:
 * summary: Register a new user
 * tags:
 * - Users
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * username:
 * type: string
 * example: JohnDoe
 * email:
 * type: string
 * example: johndoe@hotmail.com
 * password:
 * type: string
 * example: password123
 * responses:
 * 200:
 * description: User registered successfully
 * 400:
 * description: Bad request
 */
router.post('/register', UserController.registerUser); 

router.post('/login', UserController.loginUser);

router.get('/getAllUsers', UserController.getAllUsers);

router.get('/getUserBy/:param/:value', UserController.getUserBy); 

router.delete('/deleteUser/:user_id', UserController.deleteUser);

router.get('/me', authenticateToken, UserController.getMe);


/////////////////////////////////////////////////////////////////
//////////////////////////// manager ////////////////////////////
/////////////////////////////////////////////////////////////////

router.post('/changeUserRole', ManagerController.changeUserRole);


/////////////////////////////////////////////////////////////////
///////////////////////////// tmdb //////////////////////////////
/////////////////////////////////////////////////////////////////

// All these routes now point to the MovieController with the renamed functions
router.get('/movies/tmdb', MovieController.getMoviesTMDB);
router.get('/movies/tmdb/search', MovieController.searchMoviesTMDB);
router.get('/movies/tmdb/genres', MovieController.getTMDBGenres);
router.get('/movies/tmdb/:id', MovieController.getMovieDetailsTMDB);
router.get('/movies/tmdb/:id/videos', MovieController.getMovieVideosTMDB);
router.get('/movies/tmdb/:id/credits', MovieController.getMovieCreditsTMDB);
router.get('/movies/details/:title', MovieController.getMovieByTitleTMDB);

// IMPORTANT: Move any non-TMDB movie routes that use dynamic IDs AFTER the TMDB routes
// to avoid conflicts with the TMDB routes above

/////////////////////////////////////////////////////////////////
///////////////////////////// movies ////////////////////////////
/////////////////////////////////////////////////////////////////

router.get('/movies', MovieController.getAllMovies);

router.get('/movies/:id', MovieController.getMovieById);

router.post('/movies', MovieController.addMovie);

router.patch('/movies/:id', MovieController.editMovie);

router.delete('/movies/:id', MovieController.deleteMovie);


/////////////////////////////////////////////////////////////////
/////////////////////////// screenings //////////////////////////
/////////////////////////////////////////////////////////////////

router.get('/screenings', ScreeningController.getAllScreenings);

router.get('/screenings/:id', ScreeningController.getScreeningById);

router.post('/screenings', ScreeningController.createScreenings);

router.patch('/screenings/:id', ScreeningController.updateScreenings);

router.delete('/screenings/:id', ScreeningController.deleteScreenings);

/////////////////////////////////////////////////////////////////
/////////////////////// reservations ////////////////////////////
/////////////////////////////////////////////////////////////////

// GET available tickets for a screening
router.get('/screenings/:id/tickets', ReservationController.getTicketsForScreening);

// POST reserve seats
router.post('/reserve', authenticateToken, ReservationController.reserveTickets);

router.get('/my-reservations', authenticateToken, ReservationController.getMyReservations);

router.get('/users/:id/reservations', ReservationController.getReservationsForUser);


/////////////////////////////////////////////////////////////////
/////////////////////////// Halls ///////////////////////////////
/////////////////////////////////////////////////////////////////

router.get('/halls', HallController.getAllHalls);

export default router;