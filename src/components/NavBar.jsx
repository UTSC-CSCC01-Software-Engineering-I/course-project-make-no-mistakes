import { Link } from 'react-router'

function NavBar() {
  return (
    <nav>
      <Link to="/">Browse</Link>
      {' | '}
      <Link to="/signin">Sign In</Link>
      {' | '}
      <Link to="/profile">Profile</Link>
    </nav>
  )
}

export default NavBar