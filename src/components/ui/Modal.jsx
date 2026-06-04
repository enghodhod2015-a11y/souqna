export const Modal = ({ children, onClose, title }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
    <div className="bg-primary-card rounded-2xl p-6 max-w-lg w-full border border-gold/30" onClick={e => e.stopPropagation()}>
      <h2 className="text-xl font-bold text-gold mb-4">{title}</h2>
      {children}
      <button onClick={onClose} className="mt-4 text-gold underline">إغلاق</button>
    </div>
  </div>
)
