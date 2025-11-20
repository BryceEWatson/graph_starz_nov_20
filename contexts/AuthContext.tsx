import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, AuthStatus } from '../types';
import { parseJwt } from '../utils/authUtils';
import { WHITELIST } from '../constants';

interface AuthContextType {
  user: UserProfile | null;
  authStatus: AuthStatus;
  isConfigured: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>(AuthStatus.CHECKING);
  
  // Strictly use environment variable. 
  // DO NOT allow client-side injection of this ID for security.
  const clientId = process.env.GOOGLE_CLIENT_ID;

  const checkWhitelist = (email: string): boolean => {
    // In dev mode allow demo users, otherwise check constant
    return WHITELIST.includes(email) || email === 'demo@example.com';
  };

  const handleCredentialResponse = (response: any) => {
    const token = response.credential;
    const payload = parseJwt(token);

    if (payload) {
      const newUser: UserProfile = {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        avatar: payload.picture
      };

      if (checkWhitelist(payload.email)) {
        setUser(newUser);
        setAuthStatus(AuthStatus.AUTHENTICATED);
        localStorage.setItem('graph_starz_user_token', token);
      } else {
        // User authenticated with Google, but not whitelisted
        setUser(newUser); 
        setAuthStatus(AuthStatus.WAITLISTED);
      }
    }
  };

  const initializeGoogle = () => {
    if (!clientId || typeof window === 'undefined' || !window.google) return;

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false, 
        cancel_on_tap_outside: true
      });
      // We don't prompt immediately, we let LandingPage render the button
    } catch (e) {
      console.error("Error initializing Google Sign In", e);
    }
  };

  useEffect(() => {
    // 1. Check Local Storage for existing session
    const token = localStorage.getItem('graph_starz_user_token');
    if (token) {
      const payload = parseJwt(token);
      if (payload) {
         // Re-verify whitelist on reload in case access was revoked
         if (checkWhitelist(payload.email)) {
             setUser({
                id: payload.sub,
                name: payload.name,
                email: payload.email,
                avatar: payload.picture
             });
             setAuthStatus(AuthStatus.AUTHENTICATED);
         } else {
             setAuthStatus(AuthStatus.WAITLISTED);
         }
      } else {
        setAuthStatus(AuthStatus.UNAUTHENTICATED);
      }
    } else {
      setAuthStatus(AuthStatus.UNAUTHENTICATED);
    }
  }, []);

  // Re-initialize Google when script loads
  useEffect(() => {
    if (authStatus !== AuthStatus.CHECKING) {
      initializeGoogle();
    }
  }, [authStatus]);

  const logout = () => {
    localStorage.removeItem('graph_starz_user_token');
    if (window.google) {
        window.google.accounts.id.disableAutoSelect();
    }
    setUser(null);
    setAuthStatus(AuthStatus.UNAUTHENTICATED);
  };

  return (
    <AuthContext.Provider value={{ 
        user, 
        authStatus, 
        isConfigured: !!clientId,
        logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};