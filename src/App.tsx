import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppShell } from './components/AppShell'
import { RequireAuth } from './components/RequireAuth'
import { AuthProvider } from './state/AuthProvider'
import { VaultProvider } from './state/VaultProvider'
import { CategoryPage } from './pages/CategoryPage'
import { LoginPage } from './pages/LoginPage'
import { NotePage } from './pages/NotePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { SignupPage } from './pages/SignupPage'

function App() {
  return (
    <AuthProvider>
      <VaultProvider>
        <BrowserRouter>
          <Routes>
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignupPage />} />
            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route index element={<Navigate to="/personaje" replace />} />
                <Route path=":category" element={<CategoryPage />} />
                <Route path="nota/:id" element={<NotePage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </VaultProvider>
    </AuthProvider>
  )
}

export default App
