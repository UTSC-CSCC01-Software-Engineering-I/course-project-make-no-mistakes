import { Route, Routes } from 'react-router'

import NavBar from '/src/components/NavBar'

import BrowsePage from '/src/pages/BrowsePage'
import LoginPage from '/src/pages/auth/LoginPage'
import RegisterPage from '/src/pages/auth/RegisterPage'
import ViewProposalPage from '/src/pages/ViewProposalPage'
import CommissionerDashboardPage from '/src/pages/CommissionerDashboardPage'
import RequireRole from '/src/components/auth/RequireRole'
import RoleProvider from '/src/utils/RoleProvider'
import UserSubmissionsPage from '/src/pages/UserSubmissionsPage'
import SubmitObjectionPage from '/src/pages/SubmitObjectionPage'
import SubmitCounterProposalPage from '/src/pages/SubmitCounterProposalPage'

import './App.css'

function App() {
  return (
    <RoleProvider>
      <NavBar />

      <Routes>
        <Route path="/" element={<BrowsePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/commissioner-dashboard" element={<RequireRole role="commissioner"><CommissionerDashboardPage /></RequireRole>} />
        <Route path="/user-submissions" element={<RequireRole role="publicuser"><UserSubmissionsPage /></RequireRole>} />
        <Route path="/submit-objection" element={<RequireRole role="publicuser"><SubmitObjectionPage /></RequireRole>} />
        <Route path="/submit-counter-proposal" element={<RequireRole role="publicuser"><SubmitCounterProposalPage /></RequireRole>} />
        <Route
          path="/view/:proposalId"
          element={<ViewProposalPage />}
        />
      </Routes>
    </RoleProvider>
  )
}

export default App
