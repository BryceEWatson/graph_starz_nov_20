const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Custom error with HTTP status for auth error handling
export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

export interface BackendUser {
  id: string;
  email: string;
  name: string;
  profilePictureUrl?: string;
  waitlisted: boolean;
}

export interface AuthResponse {
  token: string;
  user: BackendUser;
  whitelisted: boolean;
}

/**
 * Exchange Google OAuth code for backend JWT
 */
export async function exchangeGoogleCode(code: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Authentication failed');
  }

  return response.json();
}

/**
 * Validate current JWT token
 */
export async function validateToken(token: string): Promise<{ valid: boolean; user: BackendUser; whitelisted: boolean }> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/auth/validate`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  } catch (error) {
    // Network error - backend may be unavailable
    throw new AuthError('Network error during token validation', 0);
  }

  if (!response.ok) {
    throw new AuthError('Token validation failed', response.status);
  }

  return response.json();
}

/**
 * Logout (server notified, though JWT is stateless)
 */
export async function logout(): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
  });
}

/**
 * Join waitlist
 */
export async function joinWaitlist(token: string): Promise<BackendUser> {
  const response = await fetch(`${API_BASE_URL}/auth/waitlist`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to join waitlist');
  }

  const data = await response.json();
  return data.user;
}
