import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import { fetchProposals } from '../utils/proposalsApi'
import { shortUser, formatDate, toTitleCase } from '../utils/format'
import { getRidingName } from '../utils/ridings'
import './CommissionerDashboardPage.css'
import { exportToCSV, exportToPDF } from '../utils/exportUtils'

const SUBMISSION_TYPES = [
  'Counter Proposal',
]

const COMMENT_STATUS_TYPES = ['Pending Comments', 'Approved Comments', 'Rejected Comments']
const UNKNOWN_RIDING = 'Unassigned riding'
const UNKNOWN_STATUS = 'Unknown Status'
const DASHBOARD_REFRESH_INTERVAL_MS = 30000

// colors for the pie chart breakdown
const PIE_COLORS = ['#ff2a5f', '#ffb247', '#317a51', '#7b42ff', '#a0a0a0']

const STATUS_LABELS = {
  received: 'Received',
  under_review: 'Under Review',
  addressed: 'Addressed',
}

const SUBMISSION_TYPE_LABELS = {
  comment: 'Written Comment',
  objection: 'Boundary Objection',
  counter_proposal: 'Counter Proposal',
}

const HEATMAP_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Counter Proposals', value: 'Counter Proposal' },
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
  if (submission.id) return `ID ${String(submission.id).slice(0, 12)}`
  return `Submission ${index + 1}`
}

function getSubmissionRiding(submission) {
  if (submission.riding || submission.ridingName) {
    return submission.riding || submission.ridingName
  }
  if (Array.isArray(submission.related_ridings) && submission.related_ridings.length > 0) {
    return submission.related_ridings.map(getRidingName).join(', ')
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
    status: STATUS_LABELS[submission.status] || submission.status || UNKNOWN_STATUS,
    date: submission.date || formatDate(submission.created_at),
    createdAt: submission.created_at || submission.createdAt,
    submittedBy: submission.submittedBy || shortUser(submission.user_id),
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
    { label: 'Total Posts', value: proposals.length },
    { label: 'Written Comments', value: comments.length },
    ...typeItems,
    ...commentStatusItems,
  ]
}

function buildPieChartData(proposals, comments) {
  // submission types for the pie chart
  const dataMap = {}
  
  if (comments && comments.length > 0) {
    dataMap['Written Comments'] = comments.length
  }

  proposals.forEach((proposal) => {
    const type = proposal.submissionType || 'Other'
    dataMap[type] = (dataMap[type] || 0) + 1
  })

  return Object.entries(dataMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
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
    return { ...activityMap, [submission.riding]: existingActivity }
  }, {})

  return Object.values(activityByRiding)
    .map((ridingActivity) => ({
      ...ridingActivity,
      heatLevel: ridingActivity.submissionCount >= 2 ? 'High' : 'Low',
    }))
    .sort((a, b) => b.submissionCount - a.submissionCount)
}

function getHeatmapLevel(count, maxCount) {
  if (maxCount === 0 || count === 0) return 'None'
  const heatRatio = count / maxCount
  if (heatRatio >= 0.67) return 'High'
  if (heatRatio >= 0.34) return 'Medium'
  return 'Low'
}

function buildCommissionerHeatmap(submissions, selectedSubmissionType) {
  const visibleSubmissions =
    selectedSubmissionType === 'all'
      ? submissions
      : submissions.filter((s) => s.submissionType === selectedSubmissionType)

  const allRidingNames = [...new Set(submissions.map((s) => s.riding))]

  const heatmapRows = allRidingNames.map((ridingName) => {
    const ridingSubmissions = visibleSubmissions.filter((s) => s.riding === ridingName)
    return { ridingName, submissionCount: ridingSubmissions.length }
  })

  const maxSubmissionCount = Math.max(...heatmapRows.map((row) => row.submissionCount), 0)

  return heatmapRows
    .map((row) => ({
      ...row,
      heatLevel: getHeatmapLevel(row.submissionCount, maxSubmissionCount),
      heatRatio: maxSubmissionCount === 0 ? 0 : row.submissionCount / maxSubmissionCount,
    }))
    .sort((a, b) => b.submissionCount - a.submissionCount || a.ridingName.localeCompare(b.ridingName))
}

function onlyHasUnassignedRiding(submissions) {
  return submissions.length > 0 && submissions.every((s) => s.riding === UNKNOWN_RIDING)
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

    return { ...volumeMap, [submission.date]: existingVolume }
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

// tooltip for the volume line chart
const VolumeTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="dashboardCustomChartTooltip">
        <p className="tooltipDate">{label}</p>
        <p className="tooltipCount">Submissions: <strong>{data.submissionCount}</strong></p>
        <p className="tooltipRiding">Most Active: {data.mostActiveRiding}</p>
      </div>
    )
  }
  return null
}

function CommissionerDashboardPage() {
  const navigate = useNavigate()

  const [selectedHeatmapType, setSelectedHeatmapType] = useState('all')
  const [dashboardProposals, setDashboardProposals] = useState([])
  const [dashboardComments, setDashboardComments] = useState([])
  const [status, setStatus] = useState('loading')

  const [recentSubmissions, setRecentSubmissions] = useState([])
  const [recentSubmissionsStatus, setRecentSubmissionsStatus] = useState('loading')

  useEffect(() => {
    let active = true

    async function loadDashboardData() {
      try {
        const proposals = await fetchProposals()

        if (!active) return

        setDashboardProposals(proposals.map(mapApiSubmissionToDashboardSubmission))
        setDashboardComments([]) // Mocking until comments logic is hooked up
        setStatus('ready')

        setRecentSubmissions(proposals.slice(0, 5))
        setRecentSubmissionsStatus('ready')
      } catch {
        if (!active) return
        setStatus('error')
        setRecentSubmissionsStatus('error')
      }
    }

    loadDashboardData()

    const refreshIntervalId = window.setInterval(loadDashboardData, DASHBOARD_REFRESH_INTERVAL_MS)

    return () => {
      active = false
      window.clearInterval(refreshIntervalId)
    }
  }, [])

  const overviewItems = buildOverviewItems(dashboardProposals, dashboardComments)
  const pieChartData = useMemo(() => buildPieChartData(dashboardProposals, dashboardComments), [dashboardProposals, dashboardComments])
  const ridingActivity = buildRidingActivity(dashboardProposals)
  const commissionerHeatmap = buildCommissionerHeatmap(dashboardProposals, selectedHeatmapType)
  const submissionVolume = buildSubmissionVolume(dashboardProposals)
  const heatmapNeedsRidingData = onlyHasUnassignedRiding(dashboardProposals)
  const visibleHeatmapRows = heatmapNeedsRidingData ? [] : commissionerHeatmap

  // chronological order
  const chartVolumeData = useMemo(() => [...submissionVolume].reverse(), [submissionVolume])

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
        {status === 'loading' && <p className="dashboardStatusMessage">Loading dashboard statistics...</p>}
        {status === 'error' && <p className="dashboardStatusMessage">Unable to load dashboard statistics.</p>}
        
        {status === 'ready' && (
          <div className="dashboardOverviewLayout">
            <div className="dashboardOverviewGrid">
              {overviewItems.map((item) => (
                <StatisticCard key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
            
            <div className="dashboardPieChartContainer">
              <h3>Submission Breakdown</h3>
              {pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#fff', fontSize: '13px' }}
                    />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: '#a0a0a0' }}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="dashboardStatusMessage">No submission data available.</p>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="dashboardSection" id="heatmap">
        <div className="dashboardSectionHeader">
          <h2>Riding Activity Heatmap</h2>
          <div className="dashboardHeatmapFilters" aria-label="Heatmap submission type">
            {HEATMAP_FILTERS.map((filter) => (
              <button
                className={`dashboardHeatmapFilter ${selectedHeatmapType === filter.value ? 'active' : ''}`}
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
            <span className="dashboardHeatmapEmptyTitle">Riding data is not available yet.</span>
            <span className="dashboardHeatmapEmptyText">
              Current proposals are synced with Home, but they do not include riding locations. This heatmap will show regional activity once proposal locations are connected.
            </span>
          </div>
        )}

        {visibleHeatmapRows.length > 0 && (
          <>
            <div className="dashboardHeatmapLegend" aria-label="Heatmap legend">
              <span><span className="dashboardLegendSwatch heatmapNone" />None</span>
              <span><span className="dashboardLegendSwatch heatmapLow" />Low</span>
              <span><span className="dashboardLegendSwatch heatmapMedium" />Medium</span>
              <span><span className="dashboardLegendSwatch heatmapHigh" />High</span>
            </div>
            <div className="dashboardHeatmapGrid" aria-label="Commissioner submission heatmap">
              {visibleHeatmapRows.map((riding) => (
                <article
                  className={`dashboardHeatmapTile heatmap${riding.heatLevel}`}
                  key={riding.ridingName}
                  style={{ '--heatmap-opacity': 0.18 + riding.heatRatio * 0.72 }}
                >
                  <span className="dashboardHeatmapRiding">{riding.ridingName}</span>
                  <span className="dashboardHeatmapCount">{riding.submissionCount} submissions</span>
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
                    <span className={`dashboardHeatBadge heat${riding.heatLevel}`}>{riding.heatLevel}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dashboardSection" id="volume">
        <h2>Submission Volume Over Time</h2>
        
        {chartVolumeData.length > 0 ? (
          <div className="dashboardChartContainer">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartVolumeData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333333" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#a0a0a0" 
                  tick={{ fill: '#a0a0a0', fontSize: 12 }} 
                  tickMargin={10} 
                  axisLine={false} 
                  tickLine={false}
                />
                <YAxis 
                  stroke="#a0a0a0" 
                  tick={{ fill: '#a0a0a0', fontSize: 12 }} 
                  tickMargin={10} 
                  axisLine={false} 
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<VolumeTooltip />} cursor={{ stroke: '#333', strokeWidth: 1, strokeDasharray: '3 3' }} />
                <Line 
                  type="monotone" 
                  dataKey="submissionCount" 
                  stroke="#ff2a5f" 
                  strokeWidth={3} 
                  dot={{ fill: '#1a1a1a', stroke: '#ff2a5f', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#ff2a5f', stroke: '#fff', strokeWidth: 2 }} 
                  animationDuration={1000}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="dashboardStatusMessage">No volume data to display.</p>
        )}
      </section>

      <section className="dashboardSection" id="submissions">
        <div className="dashboardSectionHeader">
          <h2>Recent Submissions</h2>
          <button className="dashboardTextAction" type="button" onClick={() => navigate('/commissioner-submissions')}>
            View All →
          </button>
        </div>
        <div className="dashboardSubmissionCards">
          {recentSubmissionsStatus === 'loading' && <p className="dashboardSubmissionsMessage">Loading recent submissions…</p>}
          {recentSubmissionsStatus === 'error' && <p className="dashboardSubmissionsMessage">Unable to load recent submissions.</p>}
          {recentSubmissionsStatus === 'ready' && recentSubmissions.length === 0 && <p className="dashboardSubmissionsMessage">No submissions yet.</p>}
          {recentSubmissionsStatus === 'ready' && recentSubmissions.map((submission) => (
            <article className="dashboardSubmissionCard" key={submission.id}>
              <div className="dashboardSubmissionInfo">
                <span className="dashboardSubmissionReference">{submission.public_reference_number}</span>
                <span className="dashboardSubmissionMeta">{toTitleCase(submission.status)}</span>
              </div>
              <div className="dashboardSubmissionInfo">
                <span className="dashboardSubmissionMeta">{shortUser(submission.user_id)}</span>
                <span className="dashboardSubmissionMeta">{formatDate(submission.created_at)}</span>
              </div>
              <button className="dashboardActionButton" type="button" onClick={() => navigate(`/view/${submission.id}`)}>
                View Details
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboardSection" id="actions">
        <h2>Quick Actions</h2>
        <div className="dashboardQuickActions">
          <button 
            className="dashboardActionButton" 
            type="button" 
            onClick={() => exportToCSV(dashboardProposals, 'all_submissions.csv')}
          >
            Export CSV
          </button>
          <button 
            className="dashboardActionButton" 
            type="button" 
            onClick={() => exportToPDF(dashboardProposals, 'all_submissions.pdf')}
          >
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