import { NavLink } from 'react-router'
import './NavBar.css'

function NavBar() {
  return (
    <nav className="navBar">
      <NavLink to="/" className="navBarLink">
        Browse
      </NavLink>

      <NavLink to="/login" className="navBarLink">
        Login
      </NavLink>

      <NavLink to="/profile" className="navBarLink">
        Profile
      </NavLink>

      <NavLink to="/commissioner-dashboard" className="navBarLink">
        Dashboard
      </NavLink>
    </nav>
  )
}

export default NavBar
