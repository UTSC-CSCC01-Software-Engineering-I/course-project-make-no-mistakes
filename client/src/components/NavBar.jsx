import { NavLink, useNavigate } from 'react-router'
import './NavBar.css'

function NavBar() {

	const navigate = useNavigate();

	// TODO hook up to backend for verification of token
	const isLoggedIn = !!localStorage.getItem('sb_token');

	function handleLogout() {
		localStorage.removeItem('sb_token');
		navigate('/login', { replace: true });
		window.location.reload();
	}

  return (
    <nav className="navBar">
      <NavLink to="/" className="navBarLink">
        Browse
      </NavLink>

	{isLoggedIn ? (
			<button onClick={handleLogout} className='logoutButton'>
				Logout
			</button>
		) : (
			<NavLink to="/login" className="navBarLink">
			  Login
			</NavLink>
		)
	}
      <NavLink to="/commissioner-dashboard" className="navBarLink">
        Dashboard
      </NavLink>

	  <NavLink to="/user-submissions" className="navBarLink">
        My Submissions
      </NavLink>

    </nav>
  )
}

export default NavBar
