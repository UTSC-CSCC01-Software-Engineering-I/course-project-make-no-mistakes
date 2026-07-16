const { Sequelize, DataTypes, Op } = require('sequelize');

function createSequelize() {
  if (process.env.DATABASE_URL) {
    console.log(
      '[db] Using Postgres via DATABASE_URL (data Supabase project — not auth)'
    );
    return new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
    });
  }

  console.log(
    '[db] DATABASE_URL not set — using local SQLite fallback (dev/test only)'
  );
  return new Sequelize({
    dialect: 'sqlite',
    storage: process.env.SQLITE_STORAGE || './database.sqlite',
    logging: false,
  });
}

const sequelize = createSequelize();

/**
 * Local app user — lives in the DATA Postgres project.
 * Linked to Auth Supabase via authUserId (JWT `sub`), not auth.users tables.
 */
const User = sequelize.define('User', {
  authUserId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: { type: DataTypes.STRING, allowNull: true },
  username: { type: DataTypes.STRING, allowNull: true },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'citizen',
  },
});

const Proposal = sequelize.define('Proposal', {
  postUser: { type: DataTypes.STRING, allowNull: false },
  postDate: { type: DataTypes.STRING, allowNull: false },
  previewURL: { type: DataTypes.STRING, allowNull: true },
  postRating: { type: DataTypes.INTEGER, defaultValue: 0 },
  postLikes: { type: DataTypes.INTEGER, defaultValue: 0 },
  postDownvotes: { type: DataTypes.INTEGER, defaultValue: 0 },
  postComments: { type: DataTypes.INTEGER, defaultValue: 0 },
  userId: { type: DataTypes.STRING, allowNull: true },
  mapData: { type: DataTypes.JSON, allowNull: true },
  title: { type: DataTypes.STRING, allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
});

const Comment = sequelize.define('Comment', {
  content: { type: DataTypes.STRING, allowNull: false },
  proposalId: { type: DataTypes.STRING, allowNull: false },
  // Stores Auth Supabase UUID (authUserId) for ownership checks
  userId: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
  upvotes: { type: DataTypes.INTEGER, defaultValue: 0 },
  downvotes: { type: DataTypes.INTEGER, defaultValue: 0 },
  rejectionReason: { type: DataTypes.STRING, allowNull: true },
  authorName: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Anonymous',
  },
  relatedRidings: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
});

const Submission = sequelize.define('Submission', {
  referenceNumber: { type: DataTypes.STRING, allowNull: false },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['comment', 'objection', 'counterproposal']],
    },
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Received',
  },
  date: { type: DataTypes.STRING, allowNull: false },
  riding: { type: DataTypes.STRING, allowNull: true },
  content: { type: DataTypes.TEXT, allowNull: false },
  previewURL: { type: DataTypes.STRING, allowNull: true },
  postRating: { type: DataTypes.INTEGER, allowNull: true },
  postVotes: { type: DataTypes.INTEGER, allowNull: true },
  postComments: { type: DataTypes.INTEGER, allowNull: true },
  // Auth Supabase UUID of the owner
  userId: { type: DataTypes.STRING, allowNull: false },
  mapData: { type: DataTypes.JSON, allowNull: true },
  proposalId: { type: DataTypes.STRING, allowNull: true },
});

/**
 * One vote per user per proposal OR per comment.
 * value: 1 = thumbs up, -1 = thumbs down
 */
const Vote = sequelize.define(
  'Vote',
  {
    value: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { isIn: [[1, -1]] },
    },
    UserId: { type: DataTypes.INTEGER, allowNull: false },
    ProposalId: { type: DataTypes.INTEGER, allowNull: true },
    CommentId: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    indexes: [
      { unique: true, fields: ['UserId', 'ProposalId'], name: 'votes_user_proposal_unique' },
      { unique: true, fields: ['UserId', 'CommentId'], name: 'votes_user_comment_unique' },
    ],
  }
);

User.hasMany(Vote, { foreignKey: 'UserId' });
Vote.belongsTo(User, { foreignKey: 'UserId' });
Proposal.hasMany(Vote, { foreignKey: 'ProposalId' });
Vote.belongsTo(Proposal, { foreignKey: 'ProposalId' });
Comment.hasMany(Vote, { foreignKey: 'CommentId' });
Vote.belongsTo(Comment, { foreignKey: 'CommentId' });

Proposal.hasMany(Comment, {
  foreignKey: 'proposalId',
  sourceKey: 'id',
  constraints: false,
});
Comment.belongsTo(Proposal, {
  foreignKey: 'proposalId',
  targetKey: 'id',
  constraints: false,
});

async function syncModels() {
  await sequelize.sync({ alter: true });
}

/**
 * Find or create the local User row for an Auth Supabase identity.
 */
async function findOrCreateLocalUser({ authUserId, email, role, username }) {
  const [user] = await User.findOrCreate({
    where: { authUserId: String(authUserId) },
    defaults: {
      email: email || null,
      username: username || (email ? email.split('@')[0] : null),
      role: role || 'citizen',
    },
  });

  // Keep email/role reasonably fresh without fighting concurrent updates
  const updates = {};
  if (email && user.email !== email) updates.email = email;
  if (role && user.role !== role) updates.role = role;
  if (Object.keys(updates).length > 0) {
    await user.update(updates);
  }

  return user;
}

module.exports = {
  sequelize,
  Op,
  User,
  Proposal,
  Comment,
  Submission,
  Vote,
  syncModels,
  findOrCreateLocalUser,
  DataTypes,
};
