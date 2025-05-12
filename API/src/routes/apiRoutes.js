import express from 'express';
const router = express.Router();

import * as UserController from '../controllers/UserController.js';
import * as MovieController from '../controllers/Movies.js';


/////////////////////////////////////////////////////////////////
///////////////////////////// users /////////////////////////////
/////////////////////////////////////////////////////////////////

router.get('/movies', MovieController.getMovies);
router.get('/movies/:id', MovieController.getMovieDetails);

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
 *                 example: JohnDoe or johndoe@hotmail.com
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


export default router;