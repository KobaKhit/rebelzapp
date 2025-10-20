import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './lib/auth';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import SignupPage from './pages/SignupPage';
import Dashboard from './pages/Dashboard';
import ConsumerDashboard from './pages/ConsumerDashboard';
import EventDiscovery from './pages/EventDiscovery';
import EventDetails from './pages/EventDetails';
import UserProfile from './pages/UserProfile';
import Events from './pages/Events';
import NewEvent from './pages/NewEvent';
import EditEvent from './pages/EditEvent';
import Chat from './pages/Chat';
import AIChat from './pages/AIChat';
import AdminChat from './pages/AdminChat';
import AdminPage from './pages/AdminPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const AppRoutes: React.FC = () => {
  const { user, isLoading, hasPermission } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Determine if user has admin permissions
  const isAdmin = user && (hasPermission('manage_users') || hasPermission('manage_events') || hasPermission('manage_roles'));

  return (
    <Routes>
      {/* Public Routes - Signup is the landing page */}
      <Route 
        path="/" 
        element={user ? <Navigate to="/dashboard" replace /> : <SignupPage />} 
      />
      <Route 
        path="/login" 
        element={user ? <Navigate to="/dashboard" replace /> : <Login />} 
      />
      <Route 
        path="/signup" 
        element={user ? <Navigate to="/dashboard" replace /> : <SignupPage />} 
      />

      {/* Dashboard Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            {isAdmin ? <Dashboard /> : <ConsumerDashboard />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/discover"
        element={
          <ProtectedRoute>
            <EventDiscovery />
          </ProtectedRoute>
        }
      />
      <Route
        path="/events/:id"
        element={
          <ProtectedRoute>
            <EventDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <UserProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-events"
        element={
          <ProtectedRoute>
            <UserProfile />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            {isAdmin ? <Dashboard /> : <Navigate to="/dashboard" replace />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/events"
        element={
          <ProtectedRoute requiredPermission="view_events">
            <Events />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/events/new"
        element={
          <ProtectedRoute requiredPermission="manage_events">
            <NewEvent />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/events/:id/edit"
        element={
          <ProtectedRoute requiredPermission="manage_events">
            <EditEvent />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            {(hasPermission('manage_users') || hasPermission('manage_roles')) ? <AdminPage /> : <Navigate to="/dashboard" replace />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/roles"
        element={<Navigate to="/admin/users" replace />}
      />

      {/* Legacy Routes for Compatibility */}
      <Route
        path="/events"
        element={
          <ProtectedRoute>
            {hasPermission('view_events') ? <Events /> : <EventDiscovery />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute requiredPermission="manage_users">
            <AdminPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/chat"
        element={
          <ProtectedRoute>
            {(hasPermission('manage_users') || hasPermission('manage_events')) ? <AdminChat /> : <Navigate to="/dashboard" replace />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-chat"
        element={
          <ProtectedRoute>
            <AIChat />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
    </Routes>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <AppRoutes />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
