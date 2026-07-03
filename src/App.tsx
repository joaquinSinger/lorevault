import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppShell } from './components/AppShell'
import { VaultProvider } from './state/VaultProvider'
import { CategoryPage } from './pages/CategoryPage'
import { NotePage } from './pages/NotePage'
import { NotFoundPage } from './pages/NotFoundPage'

function App() {
  return (
    <VaultProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/personaje" replace />} />
            <Route path=":category" element={<CategoryPage />} />
            <Route path="nota/:id" element={<NotePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </VaultProvider>
  )
}

export default App
