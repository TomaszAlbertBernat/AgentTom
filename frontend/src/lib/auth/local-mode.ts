/**
 * Local mode detection and handling
 */

import { cookies } from 'next/headers';

// Check if the backend is running in local mode
export async function isLocalMode(): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}/api/local-user/me`, {
      cache: 'no-store',
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.isLocal === true;
    }
    
    return false;
  } catch (error) {
    // If we can't reach the API, assume we're not in local mode
    return false;
  }
}

// Get local user information
export async function getLocalUser() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}/api/local-user/me`, {
      cache: 'no-store',
    });
    
    if (response.ok) {
      return await response.json();
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Check if setup is needed
export async function needsSetup(): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}/api/setup/status`, {
      cache: 'no-store',
    });
    
    if (response.ok) {
      const data = await response.json();
      return !data.status.isComplete;
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

// Check if user is authenticated (either JWT or local mode)
export async function isAuthenticated(): Promise<{ authenticated: boolean; isLocal: boolean; user?: any }> {
  const store = await cookies();
  const jwt = store.get('jwt')?.value;
  
  // Check for JWT first
  if (jwt) {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${jwt}`,
        },
        cache: 'no-store',
      });
      
      if (response.ok) {
        const user = await response.json();
        return { authenticated: true, isLocal: false, user };
      }
    } catch (error) {
      // JWT validation failed, fall through to local mode check
    }
  }
  
  // Check for local mode
  const localUser = await getLocalUser();
  if (localUser?.isLocal) {
    return { authenticated: true, isLocal: true, user: localUser };
  }
  
  return { authenticated: false, isLocal: false };
}
