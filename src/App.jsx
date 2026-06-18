import { Link, Route, Routes } from 'react-router'

import BrowsePage from './pages/BrowsePage'
import SignInPage from './pages/SignInPage'
import ProfilePage from './pages/ProfilePage'

import './App.css'

function App() {
  return (
    <>
      <nav>
        <Link to="/">Browse</Link>
        {' | '}
        <Link to="/signin">Sign In</Link>
        {' | '}
        <Link to="/profile">Profile</Link>
      </nav>

      <Routes>
        <Route path="/" element={<BrowsePage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </>
  )
}

export default App