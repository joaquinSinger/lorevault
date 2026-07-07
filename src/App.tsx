import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppShell } from './components/AppShell'
import { RequireAuth } from './components/RequireAuth'
import { RequireVault } from './components/RequireVault'
import { AuthProvider } from './state/AuthProvider'
import { VaultProvider } from './state/VaultProvider'
import { CategoryPage } from './pages/CategoryPage'
import { LoginPage } from './pages/LoginPage'
import { NotePage } from './pages/NotePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { SignupPage } from './pages/SignupPage'
import { VaultsPage } from './pages/VaultsPage'

function App() {
  return (
    <AuthProvider>
      <VaultProvider>
        <BrowserRouter>
          <Routes>
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignupPage />} />
            <Route element={<RequireAuth />}>
              {/* Paso obligatorio post-login: elegir o crear un vault (spec.md §6). */}
              <Route path="vaults" element={<VaultsPage />} />
              <Route path="vaults/:vaultId" element={<RequireVault />}>
                <Route element={<AppShell />}>
                  <Route index element={<Navigate to="personaje" replace />} />
                  <Route path=":category" element={<CategoryPage />} />
                  <Route path="nota/:id" element={<NotePage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Route>
              {/* Las rutas de Etapa 1 vivían en la raíz; ahora todo pasa por /vaults. */}
              <Route index element={<Navigate to="/vaults" replace />} />
              <Route path="*" element={<Navigate to="/vaults" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </VaultProvider>
    </AuthProvider>
  )
}

export default App
