import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import rebelzLogo from '../assets/rebelz-logo-old.png';
import {
  HomeIcon,
  CalendarIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  ChatBubbleBottomCenterTextIcon,
  ArrowRightOnRectangleIcon,
  MagnifyingGlassIcon,
  UserIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Determine if user has admin permissions
  const isAdmin = user && (hasPermission('manage_users') || hasPermission('manage_events') || hasPermission('manage_roles'));

  // Consumer navigation
  const consumerNavigation = [
    { name: 'Home', href: '/', icon: HomeIcon, current: location.pathname === '/' },
    { name: 'Discover Events', href: '/discover', icon: MagnifyingGlassIcon, current: location.pathname.startsWith('/discover') },
    { name: 'My Profile', href: '/profile', icon: UserIcon, current: location.pathname.startsWith('/profile') || location.pathname.startsWith('/my-events') },
    { name: 'AI Chat', href: '/chat', icon: ChatBubbleBottomCenterTextIcon, current: location.pathname === '/chat' },
  ];

  // Admin navigation
  const adminNavigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon, current: location.pathname === '/' || location.pathname === '/admin' },
    { name: 'Events', href: '/admin/events', icon: CalendarIcon, current: location.pathname.startsWith('/events') || location.pathname.startsWith('/admin/events') },
    {
      name: 'Users',
      href: '/admin/users',
      icon: UserGroupIcon,
      current: location.pathname.startsWith('/users') || location.pathname.startsWith('/admin/users'),
      permission: 'manage_users' as const,
    },
    {
      name: 'Roles & Permissions',
      href: '/admin/roles',
      icon: ShieldCheckIcon,
      current: location.pathname.startsWith('/admin/roles'),
      permission: 'manage_roles' as const,
    },
    { name: 'AI Chat', href: '/chat', icon: ChatBubbleBottomCenterTextIcon, current: location.pathname === '/chat' },
  ];

  const navigation = isAdmin ? adminNavigation : consumerNavigation;
  const filteredNavigation = navigation.filter(item => 
    !item.permission || hasPermission(item.permission)
  );

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
              <div className="ml-4 flex items-center md:ml-6">
                <div className={`text-sm mr-4 ${isAdmin ? 'text-gray-300' : 'text-blue-100'}`}>
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
          </div>
        </div>
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