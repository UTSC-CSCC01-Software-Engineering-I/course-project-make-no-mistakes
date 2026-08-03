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
});

const CommentVote = sequelize.define('CommentVote', {
  commentId: { type: DataTypes.INTEGER, allowNull: false },
  userId: { type: DataTypes.STRING, allowNull: false },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { isIn: [['upvote', 'downvote']] },
  },
}, {
  indexes: [{ unique: true, fields: ['commentId', 'userId'] }],
});

// Forces SQLite to create the tables if they are missing
sequelize.sync();

// Export only the Comment model
module.exports = { sequelize, Comment, CommentVote };
