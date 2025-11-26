import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, AuthStatus } from '../types';
import { exchangeGoogleCode, validateToken, logout as logoutApi, BackendUser, joinWaitlist as joinWaitlistApi } from '../services/authService';

interface AuthContextType {
  user: UserProfile | null;
  authStatus: AuthStatus;
  isConfigured: boolean;
  login: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  joinWaitlist: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'graph_starz_jwt_token';

// Convert backend user to frontend UserProfile
function toUserProfile(backendUser: BackendUser): UserProfile {
  return {
    id: backendUser.id,
    name: backendUser.name,
    email: backendUser.email,
    avatar: backendUser.profilePictureUrl
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>(AuthStatus.CHECKING);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  /**
   * Login with Google OAuth code
   */
  const login = async (code: string) => {
    try {
      setAuthStatus(AuthStatus.CHECKING);

      // Exchange code for our backend JWT
      const response = await exchangeGoogleCode(code);

      // Store our JWT token
      localStorage.setItem(TOKEN_KEY, response.token);

      // Set user state
      setUser(toUserProfile(response.user));

      // Set auth status based on whitelist and waitlist status
      if (response.whitelisted) {
        setAuthStatus(AuthStatus.AUTHENTICATED);
      } else if (response.user.waitlisted) {
        setAuthStatus(AuthStatus.WAITLISTED);
      } else {
        setAuthStatus(AuthStatus.UNAUTHENTICATED);
      }
    } catch (error) {
      setAuthStatus(AuthStatus.UNAUTHENTICATED);
      throw error;
    }
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      await logoutApi();
    } catch (error) {
      // Silently fail - logout will still clear local state
    }

    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setAuthStatus(AuthStatus.UNAUTHENTICATED);
  };

  /**
   * Join waitlist
   */
  const joinWaitlist = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      throw new Error('Must be logged in to join waitlist');
    }

    try {
      const updatedUser = await joinWaitlistApi(token);
      setUser(toUserProfile(updatedUser));
      setAuthStatus(AuthStatus.WAITLISTED);
    } catch (error) {
      throw error;
    }
  };

  /**
   * Check for existing session on mount
   */
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        setAuthStatus(AuthStatus.UNAUTHENTICATED);
        return;
      }

      try {
        // Validate token with backend
        const response = await validateToken(token);

        if (response.valid && response.user) {
          // Reconstruct user from validated data
          setUser(toUserProfile(response.user));

          // Set auth status based on whitelist and waitlist status
          if (response.whitelisted) {
            setAuthStatus(AuthStatus.AUTHENTICATED);
          } else if (response.user.waitlisted) {
            setAuthStatus(AuthStatus.WAITLISTED);
          } else {
            setAuthStatus(AuthStatus.UNAUTHENTICATED);
          }
        } else {
          // Token invalid
          localStorage.removeItem(TOKEN_KEY);
          setAuthStatus(AuthStatus.UNAUTHENTICATED);
        }
      } catch (error) {
        localStorage.removeItem(TOKEN_KEY);
        setAuthStatus(AuthStatus.UNAUTHENTICATED);
      }
    };

    checkSession();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      authStatus,
      isConfigured: !!clientId,
      login,
      logout,
      joinWaitlist
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