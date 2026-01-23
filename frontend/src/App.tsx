import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import { WizardPage, History, Compare, Workspace, HomePage, IdealResumePage } from './pages'
import { Toaster } from './components/Toast'

function App() {
  return (
    <>
      <Routes>
        {/* Home page - mode selection */}
        <Route path="/" element={<HomePage />} />
        
        {/* Wizard as main flow - no Layout wrapper (has its own) */}
        <Route path="/wizard" element={<WizardPage />} />
        
        {/* Ideal resume generation */}
        <Route path="/ideal-resume" element={<IdealResumePage />} />
        
        {/* Other pages with Layout */}
        <Route element={<Layout />}>
          <Route path="workspace" element={<Workspace />} />
          <Route path="history" element={<History />} />
          <Route path="compare" element={<Compare />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  )
}

export default App
