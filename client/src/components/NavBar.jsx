import { NavLink, useNavigate } from 'react-router'
import axios from 'axios'
import { getToken, isTokenValid } from '/src/utils/authToken'
import { useRoleContext } from '/src/utils/RoleProvider'
import './NavBar.css'

function NavBar() {

	const navigate = useNavigate();

	const isLoggedIn = isTokenValid();
	const { role, refreshRole } = useRoleContext();

	async function handleLogout() {
		try {
			await axios.post('http://localhost:8080/auth/logout', null, {
				headers: { Authorization: `Bearer ${getToken()}` }
			});
		} catch {}

		localStorage.removeItem('sb_token');
		localStorage.removeItem('token')

		await refreshRole();

		window.dispatchEvent(new Event('auth-changed'))
		navigate('/login', { replace: true });
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

		{
			role === 'commissioner' ?
				(
					<NavLink to="/commissioner-dashboard"
						className={({ isActive }) =>
							isActive ? "navBarLink activeNavBarLink" : "navBarLink"
						}>
					Dashboard
					</NavLink>
				) : null
		}

		{
			role === 'publicuser' ?
				(
					<NavLink to="/user-submissions"
						className={({ isActive }) =>
							isActive ? "navBarLink activeNavBarLink" : "navBarLink"
						}>
					My Submissions
					</NavLink>
				) : null
		}
	  	
		<div className="navBarR">
			{isLoggedIn ? (
				<button onClick={handleLogout} className='logoutButton'>
					Logout
				</button>
				) : (
					<NavLink to="/login"
					className={({ isActive }) =>
						isActive ? "navBarLink activeNavBarLink loginButton" : "navBarLink loginButton"
					}>
					Login
					</NavLink>
				)
			}
		</div>
	  	

    </nav>
  )
}

export default NavBar