import db from '../db.js';
import jwt from 'jsonwebtoken'; // JWT token generation
import { registerSchema } from '../middleware/validation.js'; // min/max length checker for name, email, password
import bcrypt from 'bcrypt'; // password hashing

const getAllUsers = async (req, res) => {
    try {
        const [result] = await db.execute('SELECT user_id, username, email FROM users');
        if (result.length === 0) {
            return res.status(404).json({ error: 'Geen gebruikers gevonden' });
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getUserBy = async (req, res) => {
    try {
        const { param, value } = req.params; // Get column name and value from URL params
        
        // Validate the column name to prevent SQL injection
        const allowedParams = ['user_id', 'username', 'email']; // Define allowed columns
        if (!allowedParams.includes(param)) {
            return res.status(400).json({ error: "Invalid search parameter" });
        }

        // Query database dynamically
        const query = `SELECT user_id, username, email FROM users WHERE ${param} = ?`;
        const [result] = await db.execute(query, [value]);

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getMe = async (req, res) => {
  const [rows] = await db.query('SELECT username FROM users WHERE user_id = ?', [req.user.userId]);
  if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ username: rows[0].username });
};

const deleteUser = async (req, res) => {
    try {
        const { user_id } = req.params;

        // Haal de oude gebruikersgegevens op
        const [oldUser] = await db.execute(
            'SELECT user_id, username, email FROM users WHERE user_id = ?', 
            [user_id]
        );

        if (oldUser.length === 0) {
            return res.status(404).json({ error: 'Gebruiker niet gevonden' });
        }

        // Verwijder de gebruiker
        await db.execute('DELETE FROM users WHERE user_id = ?', [user_id]);

        // Stuur de verwijderde gebruikersinformatie terug
        res.json({ message: 'Account verwijderd', oldUser: oldUser[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const registerUser = async (req, res) => {
    try {
        const { error } = registerSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { username, email, password } = req.body;

        // Check of de user al bestaat
        const [existingUser] = await db.execute('SELECT user_id FROM users WHERE username = ?', [username]);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'Gebruiker bestaat al' });
        }

        // Check of email al bestaat
        const [existingEmail] = await db.execute('SELECT user_id FROM users WHERE email = ?', [email]);
        if (existingEmail.length > 0) {
            return res.status(400).json({ error: 'Email al in gebruik' });
        }

        // Hash het wachtwoord
        const hashedPassword = await bcrypt.hash(password, 10);

        // Voeg gebruiker toe aan database
        const [result] = await db.execute(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );

        res.status(201).json({ message: 'Account aangemaakt', userId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const loginUser = async (req, res) => {
    try {
        const { usernameOrEmail, password } = req.body;

        // Check if the input is a username or email
        const [user] = await db.execute(
            'SELECT user_id, password_hash FROM users WHERE username = ? OR email = ?',
            [usernameOrEmail, usernameOrEmail]
        );

        if (user.length === 0) {
            return res.status(400).json({ error: 'Ongeldige gebruikersnaam of email' });
        }

        const isPasswordValid = await bcrypt.compare(password, user[0].password_hash);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Ongeldig wachtwoord' });
        }

        // Genereer JWT token
        const token = jwt.sign({ userId: user[0].user_id }, process.env.JWT_SECRET_KEY, {
            expiresIn: '1h',
        });
        res.json({ message: 'Inloggen succesvol', token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export {
    getAllUsers,
    getUserBy,
    deleteUser,
    registerUser,
    loginUser,
    getMe,
};