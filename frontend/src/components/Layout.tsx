import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useViewMode } from '../lib/viewMode';
import rebelzLogo from '../assets/rebelz-logo-old.png';
import {
  HomeIcon,
  CalendarIcon,
  UserGroupIcon,
  ChatBubbleBottomCenterTextIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightOnRectangleIcon,
  MagnifyingGlassIcon,
  UserIcon,
  SparklesIcon,
  ArrowsRightLeftIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, hasPermission } = useAuth();
  const { viewMode, setViewMode, canSwitchView } = useViewMode();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  // Determine if user has admin permissions
  const hasAdminPermissions = user && (hasPermission('manage_users') || hasPermission('manage_events') || hasPermission('manage_roles'));
  
  // Use view mode if user can switch, otherwise use their actual permissions
  const isAdmin = canSwitchView ? viewMode === 'admin' : hasAdminPermissions;

  const handleViewModeToggle = () => {
    const newMode = viewMode === 'admin' ? 'consumer' : 'admin';
    setViewMode(newMode);
    // Redirect to appropriate home page
    navigate(newMode === 'admin' ? '/dashboard' : '/dashboard');
    setMobileMenuOpen(false);
  };

  // Consumer navigation
  const consumerNavigation = [
    { name: 'Home', href: '/', icon: HomeIcon, current: location.pathname === '/' },
    { name: 'Discover Events', href: '/discover', icon: MagnifyingGlassIcon, current: location.pathname.startsWith('/discover') },
    { name: 'My Profile', href: '/profile', icon: UserIcon, current: location.pathname.startsWith('/profile') || location.pathname.startsWith('/my-events') },
    { name: 'Chat', href: '/chat', icon: ChatBubbleLeftRightIcon, current: location.pathname === '/chat' },
    { name: 'AI Assistant', href: '/ai-chat', icon: ChatBubbleBottomCenterTextIcon, current: location.pathname === '/ai-chat' },
  ];

  // Admin navigation
  const adminNavigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon, current: location.pathname === '/' || location.pathname === '/admin' },
    { name: 'Events', href: '/admin/events', icon: CalendarIcon, current: location.pathname.startsWith('/events') || location.pathname.startsWith('/admin/events') },
    {
      name: 'User Management',
      href: '/admin/users',
      icon: UserGroupIcon,
      current: location.pathname.startsWith('/users') || location.pathname.startsWith('/admin/users') || location.pathname.startsWith('/admin/roles'),
      permission: 'manage_users' as const,
      alternativePermission: 'manage_roles' as const,
    },
    { name: 'Chat', href: '/chat', icon: ChatBubbleLeftRightIcon, current: location.pathname === '/chat' },
    {
      name: 'Group Management',
      href: '/admin/chat',
      icon: UserGroupIcon,
      current: location.pathname === '/admin/chat',
      permission: 'manage_events' as const,
      alternativePermission: 'manage_users' as const,
    },
    { name: 'AI Assistant', href: '/ai-chat', icon: ChatBubbleBottomCenterTextIcon, current: location.pathname === '/ai-chat' },
  ];

  const navigation = isAdmin ? adminNavigation : consumerNavigation;
  const filteredNavigation = navigation.filter(item => {
    const navItem = item as any;
    return !navItem.permission || hasPermission(navItem.permission) || (navItem.alternativePermission && hasPermission(navItem.alternativePermission));
  });

  return (
    <div className="min-h-full">
      <nav className={isAdmin ? "bg-gray-800" : "bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700"}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Link to="/" className="flex items-center space-x-3">
                  {!isAdmin ? (
                    <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <SparklesIcon className="w-6 h-6 text-white" />
                    </div>
                  ) : (
                    <img 
                      src={rebelzLogo} 
                      alt="Rebelz" 
                      className="h-24 w-auto"
                    />
                  )}
                  {!isAdmin && (
                    <div className="text-white">
                      <div className="text-xl font-bold">Rebelz</div>
                      <div className="text-xs text-blue-100">Basketball & Education</div>
                    </div>
                  )}
                </Link>
              </div>
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  {filteredNavigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={clsx(
                        item.current
                          ? (isAdmin ? 'bg-gray-900 text-white' : 'bg-white bg-opacity-20 text-white')
                          : (isAdmin ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-blue-100 hover:bg-white hover:bg-opacity-10 hover:text-white'),
                        'rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 transition-all'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="ml-4 flex items-center md:ml-6 gap-2">
                {canSwitchView && (
                  <button
                    onClick={handleViewModeToggle}
                    className={`rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 transition-all ${
                      isAdmin 
                        ? 'bg-gray-700 text-white hover:bg-gray-600' 
                        : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                    }`}
                    title={`Switch to ${viewMode === 'admin' ? 'Consumer' : 'Admin'} View`}
                  >
                    <ArrowsRightLeftIcon className="h-4 w-4" />
                    {viewMode === 'admin' ? 'Consumer View' : 'Admin View'}
                  </button>
                )}
                <div className={`text-sm mr-2 ${isAdmin ? 'text-gray-300' : 'text-blue-100'}`}>
                  {user?.full_name || user?.email}
                </div>
                <button
                  onClick={handleLogout}
                  className={`rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 transition-all ${
                    isAdmin 
                      ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                      : 'text-blue-100 hover:bg-white hover:bg-opacity-10 hover:text-white'
                  }`}
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
            <div className="flex md:hidden">
              <button
                type="button"
                className={`inline-flex items-center justify-center rounded-md p-2 ${
                  isAdmin 
                    ? 'text-gray-400 hover:bg-gray-700 hover:text-white' 
                    : 'text-white hover:bg-white hover:bg-opacity-10'
                }`}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2 sm:px-3">
              {filteredNavigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={clsx(
                    item.current
                      ? (isAdmin ? 'bg-gray-900 text-white' : 'bg-white bg-opacity-20 text-white')
                      : (isAdmin ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-blue-100 hover:bg-white hover:bg-opacity-10 hover:text-white'),
                    'block rounded-md px-3 py-2 text-base font-medium'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </div>
                </Link>
              ))}
            </div>
            <div className="border-t border-gray-700 pb-3 pt-4">
              <div className="flex items-center px-5">
                <div className="flex-shrink-0">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    isAdmin ? 'bg-gray-700' : 'bg-white bg-opacity-20'
                  }`}>
                    <UserIcon className={`h-6 w-6 ${isAdmin ? 'text-gray-300' : 'text-white'}`} />
                  </div>
                </div>
                <div className="ml-3">
                  <div className={`text-base font-medium ${isAdmin ? 'text-white' : 'text-white'}`}>
                    {user?.full_name || 'User'}
                  </div>
                  <div className={`text-sm font-medium ${isAdmin ? 'text-gray-400' : 'text-blue-100'}`}>
                    {user?.email}
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-1 px-2">
                {canSwitchView && (
                  <button
                    onClick={handleViewModeToggle}
                    className={`block w-full text-left rounded-md px-3 py-2 text-base font-medium ${
                      isAdmin 
                        ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                        : 'text-blue-100 hover:bg-white hover:bg-opacity-10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ArrowsRightLeftIcon className="h-5 w-5" />
                      {viewMode === 'admin' ? 'Switch to Consumer View' : 'Switch to Admin View'}
                    </div>
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className={`block w-full text-left rounded-md px-3 py-2 text-base font-medium ${
                    isAdmin 
                      ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                      : 'text-blue-100 hover:bg-white hover:bg-opacity-10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    Logout
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className={isAdmin ? "" : "bg-gray-50"}>
        <div className={isAdmin ? "mx-auto max-w-7xl py-6 sm:px-6 lg:px-8" : ""}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;