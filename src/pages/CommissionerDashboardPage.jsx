import './CommissionerDashboardPage.css'

const dashboardStatistics = {
  totalSubmissions: 128,
  writtenComments: 72,
  boundaryObjections: 38,
  counterProposals: 18,
}

const statusBreakdown = {
  received: 45,
  underReview: 30,
  addressed: 12,
}

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
        <h2>Consultation Overview</h2>
      </header>

      <section className="dashboardPlaceholderSection">
        <h2>Statistics Section</h2>
        <div className="dashboardStatisticsGrid">
          <StatisticCard
            label="Total Submissions"
            value={dashboardStatistics.totalSubmissions}
          />
          <StatisticCard
            label="Written Comments"
            value={dashboardStatistics.writtenComments}
          />
          <StatisticCard
            label="Boundary Objections"
            value={dashboardStatistics.boundaryObjections}
          />
          <StatisticCard
            label="Counter Proposals"
            value={dashboardStatistics.counterProposals}
          />
        </div>
      </section>

      <section className="dashboardPlaceholderSection">
        <h2>Status Section</h2>
        <div className="dashboardStatusGrid">
          <StatisticCard
            label="Received"
            value={statusBreakdown.received}
          />
          <StatisticCard
            label="Under Review"
            value={statusBreakdown.underReview}
          />
          <StatisticCard
            label="Addressed"
            value={statusBreakdown.addressed}
          />
        </div>
      </section>

      <section className="dashboardPlaceholderSection">
        <h2>Recent Submissions Section</h2>
        <div className="dashboardTableContainer">
          <table className="dashboardSubmissionsTable">
            <thead>
              <tr>
                <th>Reference Number</th>
                <th>Submission Type</th>
                <th>Riding</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentSubmissions.map((submission) => (
                <tr key={submission.referenceNumber}>
                  <td>{submission.referenceNumber}</td>
                  <td>{submission.submissionType}</td>
                  <td>{submission.riding}</td>
                  <td>{submission.status}</td>
                  <td>{submission.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dashboardPlaceholderSection">
        <h2>Riding Activity Section</h2>
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

      <section className="dashboardPlaceholderSection">
        <h2>Quick Actions Section</h2>
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
