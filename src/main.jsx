import { StrictMode, useState, useEffect, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { loadPrompts } from './utils/promptManager'

// Lazy-load admin page — never bundled into main app chunk
const PromptAdminPage = lazy(() => import('./components/admin/PromptAdminPage.jsx'))

function Root() {
  const [route, setRoute] = useState(window.location.hash)
  const [promptsReady, setPromptsReady] = useState(false)

  // Listen for hash changes
  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Load prompts from Supabase on startup
  useEffect(() => {
    loadPrompts().then(() => setPromptsReady(true))
  }, [])

  // Show admin page for secret hash
  if (route === '#/atom-admin') {
    return (
      <Suspense fallback={
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '100vh', background: '#0a0a0f', color: 'rgba(255,255,255,0.4)',
          fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.9rem',
        }}>
          Loading admin...
        </div>
      }>
        <PromptAdminPage />
      </Suspense>
    )
  }

  // Wait for prompts to load before showing main app
  if (!promptsReady) {
    return null // Splash screen in App.jsx will handle the visual
  }

  return <App />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
