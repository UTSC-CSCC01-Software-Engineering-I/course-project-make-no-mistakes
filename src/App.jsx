import { Route, Routes } from 'react-router'

import NavBar from './components/NavBar'

import BrowsePage from './pages/BrowsePage'
import SignInPage from './pages/SignInPage'
import ProfilePage from './pages/ProfilePage'
import ViewProposalPage from './pages/ViewProposalPage'

import './App.css'

function App() {
  return (
    <>
      <NavBar />

      <Routes>
        <Route path="/" element={<BrowsePage />} />
        <Route path="/signin" element={<SignInPage />} />
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