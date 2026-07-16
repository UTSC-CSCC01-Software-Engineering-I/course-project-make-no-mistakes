/**
 * Seed the DATA database (Postgres via DATABASE_URL, or SQLite fallback).
 *
 * Auth Supabase is NOT used here — tables live only in the data project.
 *
 * Usage:
 *   cd server && npm run seed
 */
const path = require('path');
const fs = require('fs');
const {
  sequelize,
  User,
  Proposal,
  Comment,
  Submission,
  syncModels,
} = require('../models/index.js');

const proposalsPath = path.join(__dirname, '../../client/src/data/proposals.json');
const commentsPath = path.join(__dirname, '../../client/src/data/comments.json');

const SAMPLE_SUBMISSIONS = [
  {
    referenceNumber: 'CRMP-2026-001',
    type: 'comment',
    status: 'Received',
    date: '06/20/2026',
    riding: 'Scarborough North, Ontario',
    content:
      'I believe the boundary should not split the community center from the residential area. The proposed changes would divide our neighborhood in two.',
    userId: 'seed-user-demo',
  },
  {
    referenceNumber: 'CRMP-2026-002',
    type: 'objection',
    status: 'Under Review',
    date: '06/19/2026',
    riding: 'Toronto Centre, Ontario',
    content:
      'Move the boundary to follow Yonge Street instead of Bay Street. This better reflects the historical divide and aligns with municipal wards.',
    previewURL: 'https://placehold.co/500x280/87bd93/1e5d2d?text=Objection+Map',
    postRating: 85,
    postVotes: 120,
    postComments: 14,
    userId: 'seed-user-demo',
  },
  {
    referenceNumber: 'CRMP-2026-003',
    type: 'counterproposal',
    status: 'Addressed',
    date: '06/18/2026',
    riding: 'Ottawa West, Ontario',
    content:
      'Alternative map grouping the northern suburbs with the rural district to balance the population quota while maintaining communities of interest.',
    previewURL: 'https://placehold.co/500x280/87bd93/1e5d2d?text=Counter+Proposal+Map',
    postRating: 60,
    postVotes: 45,
    postComments: 8,
    userId: 'seed-user-demo',
  },
  {
    referenceNumber: 'CRMP-2026-004',
    type: 'comment',
    status: 'Received',
    date: '06/17/2026',
    riding: 'Mississauga East, Ontario',
    content:
      'The current proposal looks fine overall, but the transit lines need to be considered. Commuters from the east end share interests with the downtown core.',
    userId: 'seed-user-demo',
  },
  {
    referenceNumber: 'CRMP-2026-005',
    type: 'objection',
    status: 'Addressed',
    date: '06/15/2026',
    riding: 'Hamilton Mountain, Ontario',
    content: 'Keep the escarpment as the hard southern boundary for the lower city ridings.',
    previewURL: 'https://placehold.co/500x280/87bd93/1e5d2d?text=Escarpment+Boundary',
    postRating: 92,
    postVotes: 200,
    postComments: 30,
    userId: 'seed-user-demo',
  },
];

async function seed() {
  const usingPostgres = Boolean(process.env.DATABASE_URL);
  console.log(
    usingPostgres
      ? '[seed] DATABASE_URL present — seeding data Supabase Postgres'
      : '[seed] DATABASE_URL missing — seeding local SQLite'
  );

  await syncModels();

  const [seedUser] = await User.findOrCreate({
    where: { authUserId: 'seed-user-demo' },
    defaults: {
      email: 'seed@example.com',
      username: 'seed-demo',
      role: 'citizen',
    },
  });
  console.log(`[seed] Local User ready (id=${seedUser.id}, authUserId=${seedUser.authUserId})`);

  if (fs.existsSync(proposalsPath)) {
    const proposals = JSON.parse(fs.readFileSync(proposalsPath, 'utf8'));
    let created = 0;
    for (const p of proposals) {
      const existing = await Proposal.findOne({
        where: {
          postUser: p.postUser,
          postDate: p.postDate,
          previewURL: p.previewURL,
        },
      });
      if (existing) continue;
      await Proposal.create({
        postUser: p.postUser,
        postDate: p.postDate,
        previewURL: p.previewURL,
        postRating: p.postRating,
        postLikes: p.postLikes,
        postDownvotes: 0,
        postComments: p.postComments,
        userId: `seed-${p.postUser}`,
        mapData: p.mapData || null,
      });
      created += 1;
    }
    console.log(`[seed] Proposals: created ${created}, skipped ${proposals.length - created} existing`);
  } else {
    console.log('[seed] proposals.json not found — skipping');
  }

  if (fs.existsSync(commentsPath)) {
    const comments = JSON.parse(fs.readFileSync(commentsPath, 'utf8'));
    let created = 0;
    let i = 0;
    for (const c of comments) {
      i += 1;
      const existing = await Comment.findOne({
        where: {
          content: c.postComment,
          proposalId: String(c.proposalId),
          authorName: c.postUser,
        },
      });
      if (existing) continue;
      await Comment.create({
        content: c.postComment,
        proposalId: String(c.proposalId),
        userId: `seed-comment-user-${i}`,
        authorName: c.postUser,
        relatedRidings: c.relatedRidings || [],
        upvotes: c.postLikes || 0,
        status: 'approved',
      });
      created += 1;
    }
    console.log(`[seed] Comments: created ${created}, skipped ${comments.length - created} existing`);
  } else {
    console.log('[seed] comments.json not found — skipping');
  }

  let subCreated = 0;
  for (const s of SAMPLE_SUBMISSIONS) {
    const existing = await Submission.findOne({
      where: { referenceNumber: s.referenceNumber },
    });
    if (existing) continue;
    await Submission.create(s);
    subCreated += 1;
  }
  console.log(
    `[seed] Submissions: created ${subCreated}, skipped ${SAMPLE_SUBMISSIONS.length - subCreated} existing`
  );

  await sequelize.close();
  console.log('[seed] Complete.');
}

seed().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
