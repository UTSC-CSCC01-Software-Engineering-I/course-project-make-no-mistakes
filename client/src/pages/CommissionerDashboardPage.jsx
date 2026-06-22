import './CommissionerDashboardPage.css'

const overviewItems = [
  {
    label: 'Total Submissions',
    value: 128,
  },
  {
    label: 'Written Comments',
    value: 72,
  },
  {
    label: 'Boundary Objections',
    value: 38,
  },
  {
    label: 'Counter Proposals',
    value: 18,
  },
  {
    label: 'Received',
    value: 45,
  },
  {
    label: 'Under Review',
    value: 30,
  },
  {
    label: 'Addressed',
    value: 12,
  },
]

const recentSubmissions = [
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
]

const ridingActivity = [
  {
    ridingName: 'Toronto Centre',
    submissionCount: 34,
    supportRatio: '62%',
    opposeRatio: '38%',
  },
  {
    ridingName: 'Scarborough North',
    submissionCount: 28,
    supportRatio: '55%',
    opposeRatio: '45%',
  },
  {
    ridingName: 'Ottawa South',
    submissionCount: 21,
    supportRatio: '70%',
    opposeRatio: '30%',
  },
  {
    ridingName: 'Mississauga East',
    submissionCount: 19,
    supportRatio: '48%',
    opposeRatio: '52%',
  },
]

function StatisticCard({ label, value }) {
  return (
    <article className="dashboardStatisticCard">
      <span className="dashboardStatisticValue">{value}</span>
      <span className="dashboardStatisticLabel">{label}</span>
    </article>
  )
}

function CommissionerDashboardPage() {
  return (
    <main className="commissionerDashboardPage">
      <header className="commissionerDashboardHeader">
        <h1>Commissioner Dashboard</h1>
      </header>

      <nav className="dashboardInternalNav" aria-label="Dashboard sections">
        <a href="#overview">Overview</a>
        <a href="#activity">Activity</a>
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
                <th>Support Ratio</th>
                <th>Oppose Ratio</th>
              </tr>
            </thead>
            <tbody>
              {ridingActivity.map((riding) => (
                <tr key={riding.ridingName}>
                  <td>{riding.ridingName}</td>
                  <td>{riding.submissionCount}</td>
                  <td>{riding.supportRatio}</td>
                  <td>{riding.opposeRatio}</td>
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
