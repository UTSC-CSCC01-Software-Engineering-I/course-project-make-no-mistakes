import { useState } from 'react';
import FormInput from '/src/form_components/form_input.jsx';
import styles from '/src/form_components/styles/auth_input_styles.module.css'

export default function AuthPage() {

	const [credentialEntry, setCredentialEntry] = useState({
		emailEntry: '',
		pwdEntry:   ''
	});

	function handleInputChange(e) {

		const { name, value } = e.target;

		setCredentialEntry({
			...credentialEntry,
			[name]: value
		});
	}

	function handleLoginSubmit(e) {

		e.preventDefault();
		alert(`Logging in with: ${credentialEntry.emailEntry}`);
	}

	function handleRegisterRedirect() {

		alert(`Redirecting you to registeration page...`);
	}

	return(
		<section className={styles.authContainer}>
			<h1 className={styles.authContainerTitle}>CRMP Log In</h1>
			
			<form onSubmit={handleLoginSubmit} className={styles.authForm}>

				<div>
					<FormInput
						label="Email:"
						id="email-input"
						type="email"
						name="emailEntry"
						value={credentialEntry.emailEntry}
						onChange={handleInputChange}
						className={styles.authInput}
					/>
				</div>
				
				<div>
					<FormInput 
						label="Password:"
						id="pwd-input"
						type="password"
						name="pwdEntry"
						value={credentialEntry.pwdEntry}
						onChange={handleInputChange}
						className={styles.authInput}
					/>
				</div>

				<div>
					<button type="submit" className={styles.loginButton}>
						Login
					</button>
				</div>
			</form>

			<div className={styles.registerButtonContainer}>
				<p>Don't have an account? Make one here</p>
				
				<div>
					<button className={styles.registerButton} onClick={handleRegisterRedirect}>
						Register
					</button>
				</div>
			</div>
		</section>
	);

}

