import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { fetchSubmissions } from '../utils/submissionsApi'
import { shortUser, formatDate } from '../utils/format'
import './CommissionerDashboardPage.css'

// only counter-proposals have a view page right now
const ROUTABLE_SUBMISSION_TYPES = new Set(['counter_proposal'])

// turn a snake_case enum value into title case for display
function toTitleCase(value) {
  if (!value) return ''
  return String(value)
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const commissionerSubmissions = [
  {
    referenceNumber: 'CRMP-2026-001',
    submissionType: 'Written Comment',
    riding: 'Scarborough North',
    status: 'Received',
    date: '06/20/2026',
  },
  {
    referenceNumber: 'CRMP-2026-002',
    submissionType: 'Boundary Objection',
    riding: 'Toronto Centre',
    status: 'Under Review',
    date: '06/19/2026',
  },
  {
    referenceNumber: 'CRMP-2026-003',
    submissionType: 'Counter Proposal',
    riding: 'Ottawa West',
    status: 'Addressed',
    date: '06/18/2026',
  },
  {
    referenceNumber: 'CRMP-2026-004',
    submissionType: 'Written Comment',
    riding: 'Mississauga East',
    status: 'Received',
    date: '06/17/2026',
  },
  {
    referenceNumber: 'CRMP-2026-005',
    submissionType: 'Boundary Objection',
    riding: 'Hamilton Mountain',
    status: 'Under Review',
    date: '06/16/2026',
  },
  {
    referenceNumber: 'CRMP-2026-006',
    submissionType: 'Counter Proposal',
    riding: 'Toronto Centre',
    status: 'Received',
    date: '06/15/2026',
  },
  {
    referenceNumber: 'CRMP-2026-007',
    submissionType: 'Written Comment',
    riding: 'Scarborough North',
    status: 'Addressed',
    date: '06/14/2026',
  },
  {
    referenceNumber: 'CRMP-2026-008',
    submissionType: 'Boundary Objection',
    riding: 'Ottawa West',
    status: 'Received',
    date: '06/13/2026',
  },
]

const SUBMISSION_TYPES = [
  'Written Comment',
  'Boundary Objection',
  'Counter Proposal',
]

const STATUS_TYPES = ['Received', 'Under Review', 'Addressed']

function getSubmissionDateValue(submission) {
  const [month, day, year] = submission.date.split('/').map(Number)

  return new Date(year, month - 1, day).getTime()
}

function countBy(submissions, fieldName, fieldValue) {
  return submissions.filter((submission) => submission[fieldName] === fieldValue).length
}

function buildOverviewItems(submissions) {
  const typeItems = SUBMISSION_TYPES.map((submissionType) => ({
    label: `${submissionType}s`,
    value: countBy(submissions, 'submissionType', submissionType),
  }))

  const statusItems = STATUS_TYPES.map((status) => ({
    label: status,
    value: countBy(submissions, 'status', status),
  }))

  return [
    {
      label: 'Total Submissions',
      value: submissions.length,
    },
    ...typeItems,
    ...statusItems,
  ]
}

function buildRidingActivity(submissions) {
  const activityByRiding = submissions.reduce((activityMap, submission) => {
    const existingActivity = activityMap[submission.riding] || {
      ridingName: submission.riding,
      submissionCount: 0,
      writtenComments: 0,
      boundaryObjections: 0,
      counterProposals: 0,
    }

    existingActivity.submissionCount += 1

    if (submission.submissionType === 'Written Comment') {
      existingActivity.writtenComments += 1
    } else if (submission.submissionType === 'Boundary Objection') {
      existingActivity.boundaryObjections += 1
    } else if (submission.submissionType === 'Counter Proposal') {
      existingActivity.counterProposals += 1
    }

    return {
      ...activityMap,
      [submission.riding]: existingActivity,
    }
  }, {})

  return Object.values(activityByRiding)
    .map((ridingActivity) => ({
      ...ridingActivity,
      heatLevel: ridingActivity.submissionCount >= 2 ? 'High' : 'Low',
    }))
    .sort((a, b) => b.submissionCount - a.submissionCount)
}

function buildSubmissionVolume(submissions) {
  const volumeByDate = submissions.reduce((volumeMap, submission) => {
    const existingVolume = volumeMap[submission.date] || {
      date: submission.date,
      submissionCount: 0,
      ridingCounts: {},
    }

    existingVolume.submissionCount += 1
    existingVolume.ridingCounts[submission.riding] =
      (existingVolume.ridingCounts[submission.riding] || 0) + 1

    return {
      ...volumeMap,
      [submission.date]: existingVolume,
    }
  }, {})

  return Object.values(volumeByDate)
    .map((volume) => {
      const mostActiveRiding = Object.entries(volume.ridingCounts)
        .sort((a, b) => b[1] - a[1])[0][0]

      return {
        date: volume.date,
        submissionCount: volume.submissionCount,
        mostActiveRiding,
      }
    })
    .sort((a, b) => getSubmissionDateValue(b) - getSubmissionDateValue(a))
}

function StatisticCard({ label, value }) {
  return (
    <article className="dashboardStatisticCard">
      <span className="dashboardStatisticValue">{value}</span>
      <span className="dashboardStatisticLabel">{label}</span>
    </article>
  )
}

function CommissionerDashboardPage() {
  const navigate = useNavigate()
  const overviewItems = buildOverviewItems(commissionerSubmissions)
  const ridingActivity = buildRidingActivity(commissionerSubmissions)
  const submissionVolume = buildSubmissionVolume(commissionerSubmissions)

  const [recentSubmissions, setRecentSubmissions] = useState([])
  const [recentSubmissionsStatus, setRecentSubmissionsStatus] = useState('loading')

  useEffect(() => {
    let active = true

    fetchSubmissions()
      .then((data) => {
        if (!active) return
        setRecentSubmissions(data.slice(0, 5))
        setRecentSubmissionsStatus('ready')
      })
      .catch(() => {
        if (!active) return
        setRecentSubmissionsStatus('error')
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <main className="commissionerDashboardPage">
      <header className="commissionerDashboardHeader">
        <h1>Commissioner Dashboard</h1>
      </header>

      <nav className="dashboardInternalNav" aria-label="Dashboard sections">
        <a href="#overview">Overview</a>
        <a href="#activity">Activity</a>
        <a href="#volume">Volume</a>
        <a href="#submissions">Submissions</a>
        <a href="#actions">Actions</a>
      </nav>

      <section className="dashboardSection" id="overview">
        <h2>Overview</h2>
        <div className="dashboardOverviewGrid">
          {overviewItems.map((item) => (
            <StatisticCard
              key={item.label}
              label={item.label}
              value={item.value}
            />
          ))}
        </div>
      </section>

      <section className="dashboardSection" id="activity">
        <h2>Riding Activity</h2>
        <div className="dashboardTableContainer">
          <table className="dashboardSubmissionsTable">
            <thead>
              <tr>
                <th>Riding Name</th>
                <th>Submission Count</th>
                <th>Written Comments</th>
                <th>Boundary Objections</th>
                <th>Counter Proposals</th>
                <th>Heat Level</th>
              </tr>
            </thead>
            <tbody>
              {ridingActivity.map((riding) => (
                <tr key={riding.ridingName}>
                  <td>{riding.ridingName}</td>
                  <td>{riding.submissionCount}</td>
                  <td>{riding.writtenComments}</td>
                  <td>{riding.boundaryObjections}</td>
                  <td>{riding.counterProposals}</td>
                  <td>
                    <span className={`dashboardHeatBadge heat${riding.heatLevel}`}>
                      {riding.heatLevel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dashboardSection" id="volume">
        <h2>Submission Volume Over Time</h2>
        <div className="dashboardTableContainer">
          <table className="dashboardSubmissionsTable">
            <thead>
              <tr>
                <th>Date</th>
                <th>Submissions</th>
                <th>Most Active Riding</th>
              </tr>
            </thead>
            <tbody>
              {submissionVolume.map((volume) => (
                <tr key={volume.date}>
                  <td>{volume.date}</td>
                  <td>
                    <div className="dashboardVolumeCell">
                      <span>{volume.submissionCount}</span>
                      <span
                        className="dashboardVolumeBar"
                        style={{
                          width: `${Math.max(volume.submissionCount * 32, 32)}px`,
                        }}
                        aria-hidden="true"
                      />
                    </div>
                  </td>
                  <td>{volume.mostActiveRiding}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dashboardSection" id="submissions">
        <div className="dashboardSectionHeader">
          <h2>Recent Submissions</h2>
          <button
            className="dashboardTextAction"
            type="button"
            onClick={() => navigate('/commissioner-submissions')}
          >
            View All →
          </button>
        </div>
        <div className="dashboardSubmissionCards">
          {recentSubmissionsStatus === 'loading' && (
            <p className="dashboardSubmissionsMessage">Loading recent submissions…</p>
          )}

          {recentSubmissionsStatus === 'error' && (
            <p className="dashboardSubmissionsMessage">Unable to load recent submissions.</p>
          )}

          {recentSubmissionsStatus === 'ready' && recentSubmissions.length === 0 && (
            <p className="dashboardSubmissionsMessage">No submissions yet.</p>
          )}

          {recentSubmissionsStatus === 'ready' && recentSubmissions.map((submission) => {
            const routable = ROUTABLE_SUBMISSION_TYPES.has(submission.submission_type)

            return (
              <article className="dashboardSubmissionCard" key={submission.id}>
                <div className="dashboardSubmissionInfo">
                  <span className="dashboardSubmissionReference">
                    {submission.public_reference_number}
                  </span>
                  <span className="dashboardSubmissionMeta">
                    {toTitleCase(submission.submission_type)}
                  </span>
                </div>
                <div className="dashboardSubmissionInfo">
                  <span className="dashboardSubmissionMeta">
                    {shortUser(submission.user_id)}
                  </span>
                  <span className="dashboardSubmissionMeta">
                    {toTitleCase(submission.status)} - {formatDate(submission.created_at)}
                  </span>
                </div>
                <button
                  className="dashboardActionButton"
                  type="button"
                  disabled={!routable}
                  onClick={routable ? () => navigate(`/view/${submission.id}`) : undefined}
                >
                  View Details
                </button>
              </article>
            )
          })}
        </div>
      </section>

      <section className="dashboardSection" id="actions">
        <h2>Quick Actions</h2>
        <div className="dashboardQuickActions">
          <button className="dashboardActionButton" type="button">
            Export CSV
          </button>
          <button className="dashboardActionButton" type="button">
            Export PDF
          </button>
          <button
            className="dashboardActionButton"
            type="button"
            onClick={() => navigate('/commissioner-submissions')}
          >
            View All Submissions
          </button>
        </div>
      </section>
    </main>
  )
}

export default CommissionerDashboardPage
