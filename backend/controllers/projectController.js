const db = require('../config/db');

exports.getProjects = async (req, res) => {
  try {
    const query = 'SELECT * FROM projects';
    const [results] = await db.query(query);
    res.json(results);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};
