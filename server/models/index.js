const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false
});

const Comment = sequelize.define('Comment', {
  content: { type: DataTypes.STRING, allowNull: false },
  proposalId: { type: DataTypes.STRING, allowNull: false }, 
  userId: { type: DataTypes.STRING, allowNull: false }, // Changed to STRING to hold Supabase UUIDs
  status: { type: DataTypes.STRING, defaultValue: 'pending' }, 
  upvotes: { type: DataTypes.INTEGER, defaultValue: 0 },
  downvotes: { type: DataTypes.INTEGER, defaultValue: 0 },
  rejectionReason: { type: DataTypes.STRING, allowNull: true },
  authorName: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Anonymous'
  },
  relatedRidings: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
});

// Forces SQLite to create the tables if they are missing
sequelize.sync();

// Export only the Comment model
module.exports = { sequelize, Comment };