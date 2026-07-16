import './styles/LoginPage.css'
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router'
import CredentialInput from '/src/components/auth/CredentialInput.jsx'
import { useRoleContext } from '/src/utils/RoleProvider'
import axios from "axios";

export default function LoginPage() {

	const navigate = useNavigate();
	const { refreshRole } = useRoleContext();

	// collect credentials
	const [credentialEntry, setCredentialEntry] = useState({
		emailEntry: '',
		pwdEntry:   ''
	});

	// update input fields by user edits
	function handleInputChange(e) {

		const { name, value } = e.target;

		setCredentialEntry({
			...credentialEntry,
			[name]: value
		});
	}

	// login handler
	async function handleLoginSubmit(e) {

		e.preventDefault();

		try {

			const response = await axios.post('http://localhost:8080/auth/login', credentialEntry);

			const { token, user } = response.data;
		
			localStorage.setItem('sb_token', token);
			await refreshRole();

			localStorage.setItem('user_id', user.id); 
			localStorage.setItem('user_email', user.email);
			alert(response.data.message);

			navigate('/', { replace: true });

		} catch (err) {
			alert(err.response?.data?.error || 'Login Failed');
		}

	}

	return(
		<main className="loginPage">
			<header className="loginPageHeader">
				<h1>Log In</h1>
			</header>
			
			<form onSubmit={handleLoginSubmit} className="loginForm">

				<div>
					<CredentialInput
						label="Email"
						id="email-input"
						type="email"
						name="emailEntry"
						value={credentialEntry.emailEntry}
						onChange={handleInputChange}
						className="credentialField"
					/>
				</div>
				
				<div>
					<CredentialInput 
						label="Password"
						id="pwd-input"
						type="password"
						name="pwdEntry"
						value={credentialEntry.pwdEntry}
						onChange={handleInputChange}
						className="credentialField"
					/>
				</div>

				<div className="loginButtonWrapper">
					<button type="submit" className="loginButton">
						Login
					</button>
				</div>

				<div className="registrationRedirectWrapper">
					<NavLink to="/register" className="registrationRedirect">
						Create an Account
					</NavLink>
				</div>
			</form>
		</main>
	);

}
