export const Modal = ({ children, onClose, title }) => (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div className="bg-primary-card rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gold/30 shadow-2xl" onClick={e => e.stopPropagation()}>
      <h2 className="text-xl font-bold text-gold mb-4">{title}</h2>
      <div className="bg-white rounded-xl p-2 text-gray-800">
        {children}
      </div>
      <button onClick={onClose} className="mt-4 text-gold underline float-left">إغلاق</button>
    </div>
  </div>
)

