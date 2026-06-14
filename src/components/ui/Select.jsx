export const Select = ({ children, className = '', ...props }) => (
  <select className={`bg-secondary-blue rounded-lg px-3 py-2 border border-gold/30 text-white ${className}`} {...props}>
    {children}
  </select>
)