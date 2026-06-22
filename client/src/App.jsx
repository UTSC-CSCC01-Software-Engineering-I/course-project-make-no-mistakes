import { Route, Routes } from 'react-router'

import NavBar from '/src/components/NavBar'

import BrowsePage from '/src/pages/BrowsePage'
import LoginPage from '/src/pages/auth/LoginPage'
import RegisterPage from '/src/pages/auth/RegisterPage'
import ProfilePage from '/src/pages/ProfilePage'
import ViewProposalPage from '/src/pages/ViewProposalPage'

import './App.css'

function App() {
  return (
    <>
      <NavBar />

      <Routes>
        <Route path="/" element={<BrowsePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route
          path="/view/:proposalId"
          element={<ViewProposalPage />}
        />
      </Routes>
    </>
  )
}

export default App
