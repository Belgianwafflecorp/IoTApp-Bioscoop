import db from '../db.js'; // adjust import if needed

// Get all halls
export const getAllHalls = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT hall_id, name, total_seats FROM halls');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch halls' });
  }
};