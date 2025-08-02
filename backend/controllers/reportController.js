const db = require('../config/db');
const { authenticate } = require('../middlewares/authMiddleware');

//const { Task, User, Project, Department } = require('../models');
// Helper to parse date range from query
function getDateRange(query) {
  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : null;
  return { from, to };
}
exports.getTimeReport = async function(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authenticated' 
      });
    }

    const { userId, projectId, departmentId, startDate, endDate } = req.query;
    const currentUser = req.user;

    // Build where clause based on user role and filters
    let where = {};
    
    // If user is not admin, only show their data
    if (!currentUser.is_admin) {
      where.user_id = currentUser.id;
    } else if (userId) {
      where.user_id = userId;
    }
    
    if (projectId) where.project_id = projectId;
    if (departmentId) where.department_id = departmentId;
    if (startDate) where.start_date = { ...where.start_date, [db.Sequelize.Op.gte]: new Date(startDate) };
    if (endDate) where.due_date = { ...where.due_date, [db.Sequelize.Op.lte]: new Date(endDate) };

    // Get all tasks matching the filters
    const tasks = await db.tasks.findAll({ 
      where,
      include: [
        { model: db.users, as: 'user', attributes: ['id', 'name', 'email'] },
        { model: db.projects, attributes: ['id', 'name'] },
        { model: db.departments, attributes: ['id', 'name'] }
      ]
    });

    // Calculate task statistics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;

    // Get user productivity
    const userProductivity = await db.sequelize.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(t.id) as tasksCompleted
      FROM users u
      LEFT JOIN tasks t ON t.user_id = u.id
      ${where.user_id ? 'WHERE t.user_id = :userId' : ''}
      GROUP BY u.id
    `, {
      replacements: { userId: where.user_id },
      type: db.sequelize.QueryTypes.SELECT
    });

    // Prepare response
    const response = {
      success: true,
      data: {
        taskSummary: {
          totalTasks,
          completedTasks,
          completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
        },
        userProductivity,
        projectStats: [],  // Add project stats if needed
        departmentStats: []  // Add department stats if needed
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Error in getTimeReport:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
};
exports.timeSummary = async (req, res) => {
  try {
    const { userId, projectId, departmentId } = req.query;
    const { from, to } = getDateRange(req.query);

    // Build query filters
    let where = {};
    if (userId) where.user_id = userId;
    if (projectId) where.project_id = projectId;
    if (departmentId) where.department_id = departmentId;
    if (from) where.start_time = { ...where.start_time, $gte: from };
    if (to) where.end_time = { ...where.end_time, $lte: to };

    // Aggregate time tracking
    const timeEntries = await db.task_time_tracking.findAll({ where });
    const totalDuration = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);

    res.json({ totalDuration, entries: timeEntries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.taskCompletion = async (req, res) => {
  try {
    const { userId, projectId, departmentId } = req.query;
    const { from, to } = getDateRange(req.query);

    let where = { status: 'completed' };
    if (userId) where.user_id = userId;
    if (projectId) where.project_id = projectId;
    if (departmentId) where.department_id = departmentId;
    if (from) where.completed_at = { ...where.completed_at, $gte: from };
    if (to) where.completed_at = { ...where.completed_at, $lte: to };

    const completedTasks = await db.tasks.findAll({ where });
    res.json({ count: completedTasks.length, tasks: completedTasks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add similar endpoints for user productivity and project analytics