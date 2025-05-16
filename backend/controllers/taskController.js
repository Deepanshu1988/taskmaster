const Task = require('../models/taskModel');

exports.createTask = async (req, res) => {
  try {
    const taskData = { ...req.body, created_by: req.user.id };
    const taskId = await Task.create(taskData);
    res.status(201).json({ id: taskId, ...taskData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTasks = async (req, res) => {
  try {
    const tasks = await Task.findAll();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const affectedRows = await Task.update(req.params.id, req.body);
    if (!affectedRows) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const affectedRows = await Task.delete(req.params.id);
    if (!affectedRows) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};