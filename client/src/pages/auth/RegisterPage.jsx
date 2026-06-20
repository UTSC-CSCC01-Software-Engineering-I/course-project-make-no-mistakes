import { useState } from 'react';
import { NavLink } from 'react-router';
import CredentialInput from '/src/components/auth/CredentialInput.jsx'
import axios from 'axios'
import './styles/RegistrationPage.css'

export default function RegisterPage() {
	
	// collect credentials user will be registered with
	const [credentialEntry, setCredentialEntry] = useState ({
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
	
	// registration request handler
	function handleRegisterSubmit(e) {
	
		e.preventDefault();
		alert(`Registering: ${credentialEntry.emailEntry}`);
	}

	return (
		<main className="registrationPage">

			<header className="registrationPageHeader">
				<h1>Account Registration</h1>
			</header>

			<form onSubmit={handleRegisterSubmit} className="registrationForm">

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

				<div className="registrationButtonWrapper">
					<button type="submit" className="registrationButton">
						Register
					</button>
				</div>

				<div className="loginRedirectWrapper">
					<NavLink to="/login" className="loginRedirect">
						Back to Login
					</NavLink>
				</div>
			</form>
		</main>
	);
}
