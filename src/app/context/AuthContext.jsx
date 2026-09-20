import { createContext, useContext, useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { TransitionLoader } from '@/app/components/PageTransitionWrapper';
import authService from '@/services/api/authService';
import userService from '@/services/api/userService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user_data');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [role, setRole] = useState(() => {
    const savedUser = localStorage.getItem('user_data');
    return savedUser ? JSON.parse(savedUser)?.role || null : null;
  });
  const [authReady, setAuthReady] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user_data', JSON.stringify(user));
    } else {
      localStorage.removeItem('user_data');
    }
  }, [user]);

  useEffect(() => {
    if (user?.role) setRole(user.role);
  }, [user]);

  useEffect(() => {
    async function hydrateUser() {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setAuthReady(true);
        return;
      }

      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
        setRole(currentUser.role);
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        setUser(null);
        setRole(null);
      } finally {
        setAuthReady(true);
      }
    }

    hydrateUser();
  }, []);

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      setRole(currentUser.role);
      return currentUser;
    } catch (err) {
      console.error('Failed to refresh user context:', err);
    }
  };

  const login = async (email, password, selectedRole) => {
    const response = await authService.login({ email, password, role: selectedRole });
    setUser(response.user);
    setRole(response.user.role);
    return response.user;
  };

  const logout = () => {
    setIsLoggingOut(true);
    setTimeout(async () => {
      try {
        await authService.logout();
      } catch {
        // Frontend state should still clear on logout even if the request fails.
      } finally {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        setUser(null);
        setRole(null);
        setIsLoggingOut(false);
        window.location.href = '/Zyndex/User/Log-In';
      }
    }, 10000);
  };

  const register = async (name, email, password, selectedRole) => {
    const response = await authService.register({
      name,
      email,
      password,
      role: selectedRole,
    });
    if (response.token && response.user) {
      setUser(response.user);
      setRole(response.user.role);
      return response.user;
    }

    return response.user;
  };

  const updateProfile = async (updatedData) => {
    const response = await userService.updateProfile(updatedData);
    const updatedUser = {
      ...response,
      role: response.role || role,
    };
    setUser(updatedUser);
    setRole(updatedUser.role);
    if (response.token) {
      localStorage.setItem('auth_token', response.token);
    }
    return updatedUser;
  };

  // Helper function to generate URL-safe strings
  const getUrlSafeName = () => {
    return user?.name ? encodeURIComponent(user.name.replace(/\s+/g, '-')) : 'user';
  };

  const getUrlSafeEmail = () => {
    return user?.email ? encodeURIComponent(user.email) : 'email';
  };

  const value = {
    user,
    role,
    login,
    logout,
    register,
    updateProfile,
    refreshUser,
    isAuthenticated: !!user,
    isAdmin: role === 'admin',
    isUser: role === 'user',
    isPrimaryAdmin: !!user?.isPrimaryAdmin,
    isLoggingOut,
    authReady,
    getUrlSafeName,
    getUrlSafeEmail,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {/* Logout Loader */}
      <AnimatePresence>
        {isLoggingOut && (
          <TransitionLoader 
            duration={10000} 
            message={`Logging out ${user?.name || 'user'}...`} 
          />
        )}
      </AnimatePresence>
    </AuthContext.Provider>
  );
};
