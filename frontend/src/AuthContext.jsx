import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import keycloak from './keycloak'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    keycloak
      .init({ onLoad: 'login-required', pkceMethod: 'S256', checkLoginIframe: false })
      .then((auth) => {
        setAuthenticated(auth)
        setReady(true)

        // Auto-refresh token
        setInterval(() => {
          keycloak.updateToken(60).catch(() => keycloak.logout())
        }, 30_000)
      })
      .catch(() => {
        setReady(true)
      })
  }, [])

  return (
    <AuthContext.Provider value={{ ready, authenticated, keycloak }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
