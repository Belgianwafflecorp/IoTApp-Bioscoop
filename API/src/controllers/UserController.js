import db from '../db.js';
import jwt from 'jsonwebtoken';
import { registerSchema } from '../middleware/validation.js';
import bcrypt from 'bcrypt';

const getAllUsers = async (req, res) => {
    try {
        const [result] = await db.execute('SELECT user_id, username, email');
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};