import db from '../db.js';

// manager function to change user role
async function changeUserRole(req, res) {
    const { user_id, new_role } = req.body;
    try {
        const [results] = await db.query(
            'UPDATE users SET role = ? WHERE user_id = ?',
            [new_role, user_id]
        );
        if (results.affectedRows === 0) {
            console.log(`No user found with user_id: ${user_id}`);
            return res.status(404).json({ message: 'User not found' });
        }
        console.log(`User ${user_id} role changed to ${new_role}`);
        res.status(200).json({ message: 'Role updated', results });
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ message: 'Error updating user role', error: error.message });
    }
}

export {
    changeUserRole
}
