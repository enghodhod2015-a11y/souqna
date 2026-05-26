export const Input = ({ label, error, ...props }) => (
  <div className="mb-4">
    {label && <label className="block mb-1 text-text-secondary">{label}</label>}
    <input className={`w-full px-4 py-2 rounded-lg bg-primary-card border ${error ? 'border-danger' : 'border-gold/30'} text-white focus:outline-none focus:border-gold`} {...props} />
    {error && <p className="text-danger text-sm mt-1">{error}</p>}
  </div>
)