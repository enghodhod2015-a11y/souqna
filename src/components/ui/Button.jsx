export const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const base = 'px-4 py-2 rounded-lg font-bold transition-all'
  const variants = {
    primary: 'bg-gold text-primary-blue hover:bg-opacity-90',
    secondary: 'border border-gold text-white hover:bg-gold/10',
    danger: 'bg-danger text-white hover:bg-red-700'
  }
  return <button className={`${base} ${variants[variant]} ${className}`} {...props}>{children}</button>
}