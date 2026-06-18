import { useState } from 'react'
import BrowsePage from './pages/BrowsePage'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <nav>
        <Link to="/">Home</Link>
        {' | '}
        <Link to="/profile">Profile</Link>
        {' | '}
        <Link to="/about">About</Link>
      </nav>

      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/about" element={<AboutScreen />} />
      </Routes>
    </>
  )
}

export default App
