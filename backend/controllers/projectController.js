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

exports.createProject = async (req, res) => {
  try {
    const { name, description } = req.body;
    const query = 'INSERT INTO projects (name, description) VALUES (?, ?)';
    const [result] = await db.query(query, [name, description]);
    res.status(201).json({ id: result.insertId, name, description });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const { name, description } = req.body;
    const { id } = req.params;
    const query = 'UPDATE projects SET name = ?, description = ? WHERE id = ?';
    const [result] = await db.query(query, [name, description, id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({ id, name, description });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'DELETE FROM projects WHERE id = ?';
    const [result] = await db.query(query, [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
};
