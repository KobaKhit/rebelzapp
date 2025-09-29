import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';
import { eventsApi, registrationsApi } from '../lib/api';
import { Link } from 'react-router-dom';
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon,
  TrophyIcon,
  AcademicCapIcon,
  FireIcon,
  PresentationChartLineIcon,
  BuildingOfficeIcon,
  UsersIcon,
  SparklesIcon,
  ArrowRightIcon,
  HeartIcon,
  ChatBubbleLeftEllipsisIcon,
  ShareIcon
} from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartSolidIcon,
} from '@heroicons/react/24/solid';
import Layout from '../components/Layout';

const ConsumerDashboard: React.FC = () => {
  const { user } = useAuth();

  // Show loading state for initial load
  if (!user) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-48 bg-gray-200 rounded-2xl mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="h-64 bg-gray-200 rounded-xl"></div>
                <div className="h-96 bg-gray-200 rounded-xl"></div>
              </div>
              <div className="space-y-6">
                <div className="h-48 bg-gray-200 rounded-xl"></div>
                <div className="h-64 bg-gray-200 rounded-xl"></div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.getEvents(),
  });

  const { data: myRegistrations = [], isLoading: registrationsLoading, error: registrationsError } = useQuery({
    queryKey: ['my-registrations'],
    queryFn: () => registrationsApi.getMyRegistrations(),
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter published events and sort by date
  const upcomingEvents = events
    .filter(event => event?.is_published && event?.start_time && new Date(event.start_time) > new Date())
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 6);

  // Match registrations with events to get full event data
  const myUpcomingEvents = myRegistrations
    .map(reg => {
      const event = events.find(e => e.id === reg.event_id);
      return event ? { ...reg, event } : null;
    })
    .filter(reg => reg?.event?.start_time && new Date(reg.event.start_time) > new Date())
    .sort((a, b) => new Date(a!.event.start_time).getTime() - new Date(b!.event.start_time).getTime())
    .slice(0, 3);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'sport_class': return TrophyIcon;
      case 'class': return AcademicCapIcon;
      case 'camp': return FireIcon;
      case 'workshop': return PresentationChartLineIcon;
      case 'conference': return BuildingOfficeIcon;
      case 'competition': return TrophyIcon;
      case 'community': return UsersIcon;
      default: return CalendarIcon;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'sport_class': return 'bg-green-500';
      case 'class': return 'bg-blue-500';
      case 'camp': return 'bg-orange-500';
      case 'workshop': return 'bg-purple-500';
      case 'conference': return 'bg-gray-500';
      case 'competition': return 'bg-yellow-500';
      case 'community': return 'bg-pink-500';
      default: return 'bg-indigo-500';
    }
  };

  // Mock activity feed data - this would come from a real API
  const activityFeed = [
    {
      id: 1,
      type: 'registration',
      user: 'Coach Robel',
      action: 'created a new',
      target: 'Grindhouse League Session',
      time: '2 hours ago',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face&auto=format'
    },
    {
      id: 2,
      type: 'achievement',
      user: 'Shiheed Rice-Sloan',
      action: 'completed',
      target: 'Advanced Shooting Workshop',
      time: '4 hours ago',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face&auto=format'
    },
    {
      id: 3,
      type: 'announcement',
      user: 'Rebelz Basketball',
      action: 'announced',
      target: 'Unity Klassic 2025 Registration Open',
      time: '1 day ago',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=40&h=40&fit=crop&crop=face&auto=format'
    }
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-8 mb-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white bg-opacity-10 rounded-full -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 right-10 w-24 h-24 bg-white bg-opacity-10 rounded-full"></div>
          
          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-4">
              <SparklesIcon className="w-8 h-8" />
              <h1 className="text-3xl font-bold">
                Welcome back, {user?.full_name?.split(' ')[0] || 'Player'}! 🏀
              </h1>
            </div>
            <p className="text-blue-100 text-lg mb-6">
              Ready to level up your game? Check out what's happening in the Rebelz community.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Link
                to="/discover"
                className="bg-white bg-opacity-20 hover:bg-opacity-30 px-6 py-3 rounded-lg font-medium transition-all flex items-center space-x-2"
              >
                <span>Discover Events</span>
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
              <Link
                to="/profile"
                className="border border-white border-opacity-30 hover:bg-white hover:bg-opacity-10 px-6 py-3 rounded-lg font-medium transition-all"
              >
                View Profile
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* My Upcoming Events */}
            {!registrationsError && (
              myUpcomingEvents.length > 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                    <ClockIcon className="w-6 h-6 text-blue-600" />
                    <span>My Upcoming Events</span>
                  </h2>
                  <Link
                    to="/my-events"
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    View all
                  </Link>
                </div>
                
                <div className="space-y-4">
                  {myUpcomingEvents.map((registration) => {
                    if (!registration) return null;
                    const event = registration.event;
                    const EventIcon = getEventIcon(event.type);
                    
                    return (
                      <div key={registration.id} className="flex items-center p-4 bg-gray-50 rounded-lg">
                        <div className={`w-12 h-12 ${getEventColor(event.type)} rounded-lg flex items-center justify-center mr-4`}>
                          <EventIcon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{event.title}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                            <span className="flex items-center space-x-1">
                              <CalendarIcon className="w-4 h-4" />
                              <span>{new Date(event.start_time).toLocaleDateString()}</span>
                            </span>
                            {event.location && (
                              <span className="flex items-center space-x-1">
                                <MapPinIcon className="w-4 h-4" />
                                <span>{event.location}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            registration.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            registration.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {registration.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Upcoming Events</h3>
                <p className="text-gray-600 mb-6">
                  You haven't registered for any upcoming events yet. Discover amazing events to join!
                </p>
                <Link
                  to="/discover"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Discover Events
                </Link>
              </div>
            )
            )}

            {/* Activity Feed */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
                <ChatBubbleLeftEllipsisIcon className="w-6 h-6 text-purple-600" />
                <span>Community Activity</span>
              </h2>
              
              <div className="space-y-6">
                {activityFeed.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-4">
                    <img
                      src={activity.avatar}
                      alt={activity.user}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-semibold text-gray-900">{activity.user}</span>
                        <span className="text-gray-600">{activity.action}</span>
                        <span className="font-medium text-blue-600">{activity.target}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">{activity.time}</span>
                        <div className="flex items-center space-x-3">
                          <button className="flex items-center space-x-1 text-gray-500 hover:text-red-500 transition-colors">
                            <HeartIcon className="w-4 h-4" />
                            <span className="text-sm">12</span>
                          </button>
                          <button className="flex items-center space-x-1 text-gray-500 hover:text-blue-500 transition-colors">
                            <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />
                            <span className="text-sm">3</span>
                          </button>
                          <button className="text-gray-500 hover:text-green-500 transition-colors">
                            <ShareIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-100">
                <button className="w-full py-3 text-blue-600 hover:text-blue-700 font-medium">
                  Load more activity
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Events Registered</span>
                  <span className="font-semibold text-blue-600">
                    {registrationsError ? '—' : myRegistrations.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Events Completed</span>
                  <span className="font-semibold text-green-600">
                    {registrationsError ? '—' : myRegistrations.filter(r => {
                      const event = events.find(e => e.id === r.event_id);
                      return event?.end_time && new Date(event.end_time) < new Date();
                    }).length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Community Rank</span>
                  <span className="font-semibold text-purple-600">#42</span>
                </div>
              </div>
            </div>

            {/* Featured Events */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Featured Events</h3>
                <Link
                  to="/discover"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  See all
                </Link>
              </div>
              
              <div className="space-y-4">
                {upcomingEvents.slice(0, 3).map((event) => {
                  const EventIcon = getEventIcon(event.type);
                  
                  return (
                    <Link
                      key={event.id}
                      to={`/events/${event.id}`}
                      className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-8 h-8 ${getEventColor(event.type)} rounded-lg flex items-center justify-center`}>
                          <EventIcon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 text-sm truncate">
                            {event.title}
                          </h4>
                          <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                            <span>{new Date(event.start_time).toLocaleDateString()}</span>
                            {event.capacity && (
                              <span className="flex items-center space-x-1">
                                <UserGroupIcon className="w-3 h-3" />
                                <span>{event.capacity} spots</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-6 text-white">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  to="/discover"
                  className="block w-full bg-white bg-opacity-20 hover:bg-opacity-30 py-3 px-4 rounded-lg font-medium text-center transition-all"
                >
                  Find Events
                </Link>
                <Link
                  to="/profile"
                  className="block w-full border border-white border-opacity-30 hover:bg-white hover:bg-opacity-10 py-3 px-4 rounded-lg font-medium text-center transition-all"
                >
                  Edit Profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ConsumerDashboard;
