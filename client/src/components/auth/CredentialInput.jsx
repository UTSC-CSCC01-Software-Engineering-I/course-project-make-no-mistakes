export default function CredentialInput({ label, id, type, name, value, onChange, className = '' }) {
	return (
		<div className={className}>
            	<label htmlFor={id}>{label}</label>
                	<input
                        id={id}
                        type={type}
                        name={name}
                        value={value}
                        onChange={onChange}
                        required
                	/>
		</div>
	);
}
