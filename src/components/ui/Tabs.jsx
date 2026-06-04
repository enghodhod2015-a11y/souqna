export const Tabs = ({ children, value, onChange }) => <div>{children}</div>
export const TabList = ({ children }) => <div className="flex border-b border-gold/30">{children}</div>
export const Tab = ({ children, value, onClick }) => (
  <button onClick={() => onClick(value)} className="px-4 py-2">{children}</button>
)
export const TabPanels = ({ children }) => <div>{children}</div>
export const TabPanel = ({ children, value, activeValue }) => value === activeValue ? <div>{children}</div> : null

