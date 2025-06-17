const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('email', 'in_app', 'push'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('unread', 'read', 'deleted'),
    defaultValue: 'unread'
  },
  relatedEntity: {
    type: DataTypes.STRING
  },
  relatedEntityId: {
    type: DataTypes.INTEGER
  },
  scheduledAt: {
    type: DataTypes.DATE
  },
  sentAt: {
    type: DataTypes.DATE
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['userId', 'status'] },
    { fields: ['scheduledAt', 'status'] }
  ]
});

module.exports = Notification;
