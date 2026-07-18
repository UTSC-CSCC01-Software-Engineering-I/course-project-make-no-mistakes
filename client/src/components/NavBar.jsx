import { NavLink, useNavigate } from 'react-router'
import './NavBar.css'

function NavBar() {
  const navigate = useNavigate()

  // TODO: Hook up to backend for verification of token
  const isLoggedIn = !!localStorage.getItem('sb_token')

  function handleLogout() {
    localStorage.removeItem('sb_token')
    localStorage.removeItem('token')
    window.dispatchEvent(new Event('auth-changed'))
    navigate('/login', { replace: true })
  }

  return (
    <nav className="navBar">
      <NavLink
        to="/"
        className={({ isActive }) =>
          isActive ? 'navBarLink activeNavBarLink' : 'navBarLink'
        }
      >
        Home
      </NavLink>

      <NavLink
        to="/commissioner-dashboard"
        className={({ isActive }) =>
          isActive ? 'navBarLink activeNavBarLink' : 'navBarLink'
        }
      >
        Dashboard
      </NavLink>

      <NavLink
        to="/user-submissions"
        className={({ isActive }) =>
          isActive ? 'navBarLink activeNavBarLink' : 'navBarLink'
        }
      >
        My Submissions
      </NavLink>

      <div className="navBarR">
        {isLoggedIn ? (
          <button
            type="button"
            onClick={handleLogout}
            className="logoutButton"
          >
            Logout
          </button>
        ) : (
          <NavLink
            to="/login"
            className={({ isActive }) =>
              isActive ? 'navBarLink activeNavBarLink' : 'navBarLink'
            }
          >
            Login
          </NavLink>
        )}
      </div>
    </nav>
  )
}

export default NavBar