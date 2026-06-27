import { Route, Routes } from 'react-router'

import NavBar from '/src/components/NavBar'

import BrowsePage from '/src/pages/BrowsePage'
import LoginPage from '/src/pages/auth/LoginPage'
import RegisterPage from '/src/pages/auth/RegisterPage'
import ViewProposalPage from '/src/pages/ViewProposalPage'
import CommissionerDashboardPage from '/src/pages/CommissionerDashboardPage'
import UserSubmissionsPage from '/src/pages/UserSubmissionsPage'
import SubmitObjectionPage from '/src/pages/SubmitObjectionPage'
import SubmitCounterProposalPage from '/src/pages/SubmitCounterProposalPage'

import './App.css'

function App() {
  return (
    <>
      <NavBar />

      <Routes>
        <Route path="/" element={<BrowsePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/commissioner-dashboard" element={<CommissionerDashboardPage />} />
        <Route path="/user-submissions" element={<UserSubmissionsPage />} />
        <Route path="/submit-objection" element={<SubmitObjectionPage />} />
        <Route path="/submit-counter-proposal" element={<SubmitCounterProposalPage />} />
        <Route
          path="/view/:proposalId"
          element={<ViewProposalPage />}
        />
      </Routes>
    </>
  )
}

export default App
