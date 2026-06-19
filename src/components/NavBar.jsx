import { NavLink } from 'react-router'
import './NavBar.css'

function NavBar() {
  return (
    <nav className="navBar">
      <NavLink to="/" className="navBarLink">
        Browse
      </NavLink>

      <NavLink to="/signin" className="navBarLink">
        Sign In
      </NavLink>

      <NavLink to="/profile" className="navBarLink">
        Profile
      </NavLink>
    </nav>
  )
}

export default NavBar