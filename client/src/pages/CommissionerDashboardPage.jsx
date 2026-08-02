import { useEffect, useState } from 'react'
import { fetchProposals } from '../utils/proposalsApi'
import { formatDate, shortUser } from '../utils/format'
import { getRidingName } from '../utils/ridings'
import './CommissionerDashboardPage.css'

const SUBMISSION_TYPES = [
  'Counter Proposal',
]

const COMMENT_STATUS_TYPES = ['Pending Comments', 'Approved Comments', 'Rejected Comments']
const UNKNOWN_RIDING = 'Unassigned riding'
const UNKNOWN_STATUS = 'Unknown Status'
const DASHBOARD_REFRESH_INTERVAL_MS = 30000

const STATUS_LABELS = {
  received: 'Received',
  under_review: 'Under Review',
  addressed: 'Addressed',
}

const COMMENT_STATUS_LABELS = {
  pending: 'Pending Comments',
  approved: 'Approved Comments',
  rejected: 'Rejected Comments',
}

const SUBMISSION_TYPE_LABELS = {
  comment: 'Written Comment',
  objection: 'Boundary Objection',
  counter_proposal: 'Counter Proposal',
}

const HEATMAP_FILTERS = [
  {
    label: 'All',
    value: 'all',
  },
  {
    label: 'Counter Proposals',
    value: 'Counter Proposal',
  },
]

function getSubmissionDateValue(submission) {
  const date = new Date(submission.createdAt)

  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

function countBy(submissions, fieldName, fieldValue) {
  return submissions.filter((submission) => submission[fieldName] === fieldValue).length
}

function getSubmissionReference(submission, index) {
  if (submission.referenceNumber || submission.reference_number) {
    return submission.referenceNumber || submission.reference_number
  }

  if (submission.id) {
    return `ID ${String(submission.id).slice(0, 12)}`
  }

  return `Submission ${index + 1}`
}

function getSubmissionRiding(submission) {
  if (submission.riding || submission.ridingName) {
    return submission.riding || submission.ridingName
  }

  if (Array.isArray(submission.related_ridings) && submission.related_ridings.length > 0) {
    return submission.related_ridings
      .map(getRidingName)
      .join(', ')
  }

  return UNKNOWN_RIDING
}

function mapApiSubmissionToDashboardSubmission(submission, index) {
  return {
    referenceNumber: getSubmissionReference(submission, index),
    submissionType:
      SUBMISSION_TYPE_LABELS[submission.submission_type] ||
      submission.submissionType ||
      'Counter Proposal',
    riding: getSubmissionRiding(submission),
    status:
      STATUS_LABELS[submission.status] ||
      submission.status ||
      UNKNOWN_STATUS,
    date:
      submission.date ||
      formatDate(submission.created_at),
    createdAt:
      submission.created_at ||
      submission.createdAt,
    submittedBy:
      submission.submittedBy ||
      shortUser(submission.user_id),
  }
}

function buildOverviewItems(proposals, comments) {
  const typeItems = SUBMISSION_TYPES.map((submissionType) => ({
    label: `${submissionType}s`,
    value: countBy(proposals, 'submissionType', submissionType),
  }))

  const commentStatusItems = COMMENT_STATUS_TYPES.map((status) => ({
    label: status,
    value: countBy(comments, 'status', status),
  }))

  return [
    {
      label: 'Total Posts',
      value: proposals.length,
    },
    {
      label: 'Written Comments',
      value: comments.length,
    },
    ...typeItems,
    ...commentStatusItems,
  ]
}

function buildRidingActivity(submissions) {
  const activityByRiding = submissions.reduce((activityMap, submission) => {
    const existingActivity = activityMap[submission.riding] || {
      ridingName: submission.riding,
      submissionCount: 0,
      counterProposals: 0,
    }

    existingActivity.submissionCount += 1

    if (submission.submissionType === 'Counter Proposal') {
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

function getHeatmapLevel(count, maxCount) {
  if (maxCount === 0 || count === 0) {
    return 'None'
  }

  const heatRatio = count / maxCount

  if (heatRatio >= 0.67) {
    return 'High'
  }

  if (heatRatio >= 0.34) {
    return 'Medium'
  }

  return 'Low'
}

function buildCommissionerHeatmap(submissions, selectedSubmissionType) {
  const visibleSubmissions =
    selectedSubmissionType === 'all'
      ? submissions
      : submissions.filter(
          (submission) => submission.submissionType === selectedSubmissionType
        )

  const allRidingNames = [...new Set(submissions.map((submission) => submission.riding))]

  const heatmapRows = allRidingNames.map((ridingName) => {
    const ridingSubmissions = visibleSubmissions.filter(
      (submission) => submission.riding === ridingName
    )

    return {
      ridingName,
      submissionCount: ridingSubmissions.length,
    }
  })

  const maxSubmissionCount = Math.max(
    ...heatmapRows.map((row) => row.submissionCount),
    0
  )

  return heatmapRows
    .map((row) => ({
      ...row,
      heatLevel: getHeatmapLevel(row.submissionCount, maxSubmissionCount),
      heatRatio:
        maxSubmissionCount === 0
          ? 0
          : row.submissionCount / maxSubmissionCount,
    }))
    .sort((a, b) => b.submissionCount - a.submissionCount || a.ridingName.localeCompare(b.ridingName))
}

function onlyHasUnassignedRiding(submissions) {
  return (
    submissions.length > 0 &&
    submissions.every((submission) => submission.riding === UNKNOWN_RIDING)
  )
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

function getRecentSubmissions(submissions) {
  return [...submissions]
    .sort((a, b) => getSubmissionDateValue(b) - getSubmissionDateValue(a))
    .slice(0, 5)
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
  const [selectedHeatmapType, setSelectedHeatmapType] = useState('all')
  const [dashboardProposals, setDashboardProposals] = useState([])
  const [dashboardComments, setDashboardComments] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let active = true

    async function loadDashboardData() {
      try {
        const proposals = await fetchProposals()

        if (!active) return

        setDashboardProposals(proposals.map(mapApiSubmissionToDashboardSubmission))
        setDashboardComments([])
        setStatus('ready')
      } catch {
        if (!active) return
        setStatus('error')
      }
    }

    loadDashboardData()

    const refreshIntervalId = window.setInterval(
      loadDashboardData,
      DASHBOARD_REFRESH_INTERVAL_MS
    )

    return () => {
      active = false
      window.clearInterval(refreshIntervalId)
    }
  }, [])

  const overviewItems = buildOverviewItems(dashboardProposals, dashboardComments)
  const ridingActivity = buildRidingActivity(dashboardProposals)
  const commissionerHeatmap = buildCommissionerHeatmap(
    dashboardProposals,
    selectedHeatmapType
  )
  const submissionVolume = buildSubmissionVolume(dashboardProposals)
  const recentSubmissions = getRecentSubmissions(dashboardProposals)
  const heatmapNeedsRidingData = onlyHasUnassignedRiding(dashboardProposals)
  const visibleHeatmapRows = heatmapNeedsRidingData ? [] : commissionerHeatmap

  return (
    <main className="commissionerDashboardPage">
      <header className="commissionerDashboardHeader">
        <h1>Commissioner Dashboard</h1>
      </header>

      <nav className="dashboardInternalNav" aria-label="Dashboard sections">
        <a href="#overview">Overview</a>
        <a href="#heatmap">Heatmap</a>
        <a href="#activity">Activity</a>
        <a href="#volume">Volume</a>
        <a href="#submissions">Submissions</a>
        <a href="#actions">Actions</a>
      </nav>

      <section className="dashboardSection" id="overview">
        <h2>Overview</h2>
        {status === 'loading' && (
          <p className="dashboardStatusMessage">Loading dashboard statistics...</p>
        )}
        {status === 'error' && (
          <p className="dashboardStatusMessage">Unable to load dashboard statistics.</p>
        )}
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

      <section className="dashboardSection" id="heatmap">
        <div className="dashboardSectionHeader">
          <h2>Riding Activity Heatmap</h2>
          <div className="dashboardHeatmapFilters" aria-label="Heatmap submission type">
            {HEATMAP_FILTERS.map((filter) => (
              <button
                className={`dashboardHeatmapFilter ${
                  selectedHeatmapType === filter.value ? 'active' : ''
                }`}
                key={filter.value}
                type="button"
                onClick={() => setSelectedHeatmapType(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {heatmapNeedsRidingData && (
          <div className="dashboardHeatmapEmptyState">
            <span className="dashboardHeatmapEmptyTitle">
              Riding data is not available yet.
            </span>
            <span className="dashboardHeatmapEmptyText">
              Current proposals are synced with Home, but they do not include
              riding locations. This heatmap will show regional activity once
              proposal locations are connected.
            </span>
          </div>
        )}

        {visibleHeatmapRows.length > 0 && (
          <>
            <div className="dashboardHeatmapLegend" aria-label="Heatmap legend">
              <span>
                <span className="dashboardLegendSwatch heatmapNone" />
                None
              </span>
              <span>
                <span className="dashboardLegendSwatch heatmapLow" />
                Low
              </span>
              <span>
                <span className="dashboardLegendSwatch heatmapMedium" />
                Medium
              </span>
              <span>
                <span className="dashboardLegendSwatch heatmapHigh" />
                High
              </span>
            </div>

            <div className="dashboardHeatmapGrid" aria-label="Commissioner submission heatmap">
              {visibleHeatmapRows.map((riding) => (
                <article
                  className={`dashboardHeatmapTile heatmap${riding.heatLevel}`}
                  key={riding.ridingName}
                  style={{
                    '--heatmap-opacity': 0.18 + riding.heatRatio * 0.72,
                  }}
                >
                  <span className="dashboardHeatmapRiding">{riding.ridingName}</span>
                  <span className="dashboardHeatmapCount">
                    {riding.submissionCount} submissions
                  </span>
                  <span className="dashboardHeatmapLevel">{riding.heatLevel}</span>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="dashboardSection" id="activity">
        <h2>Riding Activity</h2>
        <div className="dashboardTableContainer">
          <table className="dashboardSubmissionsTable">
            <thead>
              <tr>
                <th>Riding Name</th>
                <th>Post Count</th>
                <th>Counter Proposals</th>
                <th>Heat Level</th>
              </tr>
            </thead>
            <tbody>
              {ridingActivity.map((riding) => (
                <tr key={riding.ridingName}>
                  <td>{riding.ridingName}</td>
                  <td>{riding.submissionCount}</td>
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
          <button className="dashboardTextAction" type="button">
            View All →
          </button>
        </div>
        <div className="dashboardSubmissionCards">
          {recentSubmissions.map((submission) => (
            <article className="dashboardSubmissionCard" key={submission.referenceNumber}>
              <div className="dashboardSubmissionInfo">
                <span className="dashboardSubmissionReference">
                  {submission.referenceNumber}
                </span>
                <span className="dashboardSubmissionMeta">
                  {submission.submissionType}
                </span>
              </div>
              <div className="dashboardSubmissionInfo">
                <span className="dashboardSubmissionMeta">
                  {submission.riding}
                </span>
                <span className="dashboardSubmissionMeta">
                  {submission.status} - {submission.date}
                </span>
              </div>
              <button className="dashboardActionButton" type="button">
                View Details
              </button>
            </article>
          ))}
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
          <button className="dashboardActionButton" type="button">
            View All Submissions
          </button>
        </div>
      </section>
    </main>
  )
}

export default CommissionerDashboardPage
