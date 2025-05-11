import db from '../db.js';
import jwt from 'jsonwebtoken'; // JWT token generation
import { registerSchema } from '../middleware/validation.js'; // min/max length checker for name, email, password
import bcrypt from 'bcrypt'; // password hashing

const getAllUsers = async (req, res) => {
    try {
        const [result] = await db.execute('SELECT user_id, username, email');
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};