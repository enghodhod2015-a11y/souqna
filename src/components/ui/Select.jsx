export const Select = ({ children, className = '', textColor = 'text-white', ...props }) => (
  <select
    className={`bg-secondary-blue rounded-lg px-3 py-2 border border-gold/30 ${textColor} ${className}`}
    {...props}
  >
    {children}
  </select>
);
