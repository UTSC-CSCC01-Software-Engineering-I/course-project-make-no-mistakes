import { NavLink, useNavigate } from 'react-router'
import axios from 'axios'
import { getToken, isTokenValid } from '/src/utils/authToken'
import './NavBar.css'

function NavBar() {

	const navigate = useNavigate();

	const isLoggedIn = isTokenValid();

	async function handleLogout() {
		try {
			await axios.post('http://localhost:8080/auth/logout', null, {
				headers: { Authorization: `Bearer ${getToken()}` }
			});
		} catch {
		}

		localStorage.removeItem('sb_token');
		navigate('/login', { replace: true });
		window.location.reload();
	}

  return (
    <nav className="navBar">
      	<NavLink to="/"
			className={({ isActive }) =>
				isActive ? "navBarLink activeNavBarLink" : "navBarLink"
			}>
        	Home
      	</NavLink>

		{
			isLoggedIn ?
				(<NavLink to="/commissioner-dashboard"
					className={({ isActive }) =>
						isActive ? "navBarLink activeNavBarLink" : "navBarLink"
					}>
				Dashboard
				</NavLink>) :
				null
		}

	  	<NavLink to="/user-submissions"
			className={({ isActive }) =>
				isActive ? "navBarLink activeNavBarLink" : "navBarLink"
			}>
        	My Submissions
      	</NavLink>

		<div className="navBarR">
			{isLoggedIn ? (
				<button onClick={handleLogout} className='logoutButton'>
					Logout
				</button>
				) : (
					<NavLink to="/login"
					className={({ isActive }) =>
						isActive ? "navBarLink activeNavBarLink" : "navBarLink"
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
