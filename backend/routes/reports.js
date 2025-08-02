const express = require('express');
const router = express.Router();

// Import your models or controllers as needed
const { Task, User, Project, Department, TaskTimeTracking } = require('../models'); // adjust path as needed

// Helper to format duration, etc. if needed

router.get('/reports/time-report', async (req, res) => {
  const { userId, projectId, departmentId, startDate, endDate } = req.body;

  try {
    // Example: Query time tracking data according to filters
    // You will need to adjust these queries to fit your actual DB schema and ORM (Sequelize, Knex, etc.)

    // 1. Time spent per task/user/project/department
    // This is a simplified example. Replace with real DB queries.
    const timeEntries = await TaskTimeTracking.findAll({
      where: {
        ...(userId && { user_id: userId }),
        ...(projectId && { project_id: projectId }),
        ...(departmentId && { department_id: departmentId }),
        ...(startDate && { start_time: { $gte: new Date(startDate) } }),
        ...(endDate && { end_time: { $lte: new Date(endDate) } }),
      },
      include: [
        { model: Task, as: 'task' },
        { model: User, as: 'user' },
        { model: Project, as: 'project' },
        { model: Department, as: 'department' }
      ]
    });

    // Format timeReport
    const timeReport = timeEntries.map(entry => ({
      taskName: entry.task ? entry.task.name : '',
      userName: entry.user ? entry.user.username : '',
      projectName: entry.project ? entry.project.name : '',
      departmentName: entry.department ? entry.department.name : '',
      duration: entry.duration
    }));

    // 2. Task Completion Statistics
    // Example: Count of completed tasks in the filtered period
    const completedTasks = await Task.count({
      where: {
        ...(userId && { user_id: userId }),
        ...(projectId && { project_id: projectId }),
        ...(departmentId && { department_id: departmentId }),
        status: 'completed',
        ...(startDate && { completed_at: { $gte: new Date(startDate) } }),
        ...(endDate && { completed_at: { $lte: new Date(endDate) } }),
      }
    });

    // Example: On time vs late (dummy logic, adjust as needed)
    const onTime = Math.floor(completedTasks * 0.8);
    const late = completedTasks - onTime;

    const taskCompletion = {
      count: completedTasks,
      stats: [
        { label: 'On Time', value: onTime },
        { label: 'Late', value: late }
      ]
    };

    // 3. User Productivity Summaries
    // Example: Aggregate by user
    const users = await User.findAll();
    const userProductivity = await Promise.all(users.map(async user => {
      // Get tasks completed by user
      const userTasksCompleted = await Task.count({
        where: {
          user_id: user.id,
          status: 'completed',
          ...(startDate && { completed_at: { $gte: new Date(startDate) } }),
          ...(endDate && { completed_at: { $lte: new Date(endDate) } }),
        }
      });

      // Get total time tracked by user
      const userTimeEntries = await TaskTimeTracking.findAll({
        where: {
          user_id: user.id,
          ...(startDate && { start_time: { $gte: new Date(startDate) } }),
          ...(endDate && { end_time: { $lte: new Date(endDate) } }),
        }
      });
      const totalTime = userTimeEntries.reduce((sum, entry) => sum + entry.duration, 0);
      const avgTimePerTask = userTasksCompleted ? Math.round(totalTime / userTasksCompleted) : 0;

      return {
        name: user.username,
        tasksCompleted: userTasksCompleted,
        totalTime,
        avgTimePerTask
      };
    }));
    console.log("POST /api/reports/time-report called");
    res.json({
      timeReport: [],
      taskCompletion: {count: 0, stats: []},
      userProductivity: []
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error generating report' });
  }
});

module.exports = router;