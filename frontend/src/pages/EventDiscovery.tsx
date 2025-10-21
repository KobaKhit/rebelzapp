import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '../lib/api';
import { Link } from 'react-router-dom';
import {
  CalendarIcon,
  MapPinIcon,
  UserGroupIcon,
  TrophyIcon,
  AcademicCapIcon,
  FireIcon,
  PresentationChartLineIcon,
  BuildingOfficeIcon,
  UsersIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartSolidIcon,
  StarIcon as StarSolidIcon,
} from '@heroicons/react/24/solid';
import Layout from '../components/Layout';

interface FilterState {
  search: string;
  type: string;
  category: string;
  date: string;
  location: string;
}

const EventDiscovery: React.FC = () => {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    type: '',
    category: '',
    date: '',
    location: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.getEvents(),
  });

  const { data: eventTypes = {} } = useQuery({
    queryKey: ['event-types'],
    queryFn: () => eventsApi.getEventTypes(),
  });

  // Filter published events
  const publishedEvents = events.filter(event => event.is_published);

  // Apply filters
  const filteredEvents = useMemo(() => {
    return publishedEvents.filter(event => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const matchesTitle = event.title.toLowerCase().includes(searchTerm);
        const matchesDescription = event.description?.toLowerCase().includes(searchTerm);
        const matchesLocation = event.location?.toLowerCase().includes(searchTerm);
        
        if (!matchesTitle && !matchesDescription && !matchesLocation) {
          return false;
        }
      }

      // Type filter
      if (filters.type && event.type !== filters.type) {
        return false;
      }

      // Date filter
      if (filters.date) {
        const eventDate = new Date(event.start_time);
        const today = new Date();
        
        switch (filters.date) {
          case 'today': {
            if (eventDate.toDateString() !== today.toDateString()) return false;
            break;
          }
          case 'tomorrow': {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            if (eventDate.toDateString() !== tomorrow.toDateString()) return false;
            break;
          }
          case 'this-week': {
            const weekEnd = new Date(today);
            weekEnd.setDate(weekEnd.getDate() + 7);
            if (eventDate < today || eventDate > weekEnd) return false;
            break;
          }
          case 'this-month':
            if (eventDate.getMonth() !== today.getMonth() || eventDate.getFullYear() !== today.getFullYear()) return false;
            break;
        }
      }

      // Location filter
      if (filters.location && !event.location?.toLowerCase().includes(filters.location.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [publishedEvents, filters]);

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
      case 'sport_class': return 'from-green-500 to-emerald-500';
      case 'class': return 'from-blue-500 to-cyan-500';
      case 'camp': return 'from-orange-500 to-red-500';
      case 'workshop': return 'from-purple-500 to-violet-500';
      case 'conference': return 'from-gray-500 to-slate-500';
      case 'competition': return 'from-yellow-500 to-amber-500';
      case 'community': return 'from-pink-500 to-rose-500';
      default: return 'from-indigo-500 to-purple-500';
    }
  };

  const toggleFavorite = (eventId: number) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(eventId)) {
        newFavorites.delete(eventId);
      } else {
        newFavorites.add(eventId);
      }
      return newFavorites;
    });
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      type: '',
      category: '',
      date: '',
      location: ''
    });
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Discover Amazing Events
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Find basketball programs, educational workshops, camps, and community events that match your interests.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          {/* Search Bar */}
          <div className="relative mb-4">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search events, locations, or descriptions..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <FunnelIcon className="w-5 h-5" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center space-x-1 text-red-600 hover:text-red-700"
              >
                <XMarkIcon className="w-4 h-4" />
                <span className="text-sm">Clear all</span>
              </button>
            )}
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All types</option>
                  {Object.entries(eventTypes).map(([key, name]) => (
                    <option key={key} value={key}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <select
                  value={filters.date}
                  onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Any time</option>
                  <option value="today">Today</option>
                  <option value="tomorrow">Tomorrow</option>
                  <option value="this-week">This week</option>
                  <option value="this-month">This month</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  placeholder="Enter location"
                  value={filters.location}
                  onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => setShowFilters(false)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-gray-600">
            {isLoading ? 'Loading...' : `${filteredEvents.length} events found`}
          </p>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Sort by:</span>
            <select className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>Date (earliest first)</option>
              <option>Date (latest first)</option>
              <option>Title (A-Z)</option>
              <option>Type</option>
            </select>
          </div>
        </div>

        {/* Events Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
                <div className="w-full h-48 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your filters or search terms to find more events.
            </p>
            <button
              onClick={clearFilters}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => {
              const EventIcon = getEventIcon(event.type);
              const isFavorite = favorites.has(event.id);
              
              return (
                <div key={event.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Event Image/Header */}
                  <div className={`h-48 bg-gradient-to-br ${getEventColor(event.type)} relative`}>
                    <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                    <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
                      <div className="bg-white bg-opacity-90 rounded-lg px-3 py-1">
                        <span className="text-sm font-medium text-gray-900">
                          {eventTypes[event.type] || event.type}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleFavorite(event.id)}
                        className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-lg p-2 transition-all"
                      >
                        {isFavorite ? (
                          <HeartSolidIcon className="w-5 h-5 text-red-500" />
                        ) : (
                          <HeartIcon className="w-5 h-5 text-gray-600" />
                        )}
                      </button>
                    </div>
                    <div className="absolute bottom-4 left-4">
                      <div className="bg-white bg-opacity-90 rounded-lg p-3">
                        <EventIcon className="w-8 h-8 text-gray-700" />
                      </div>
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                      {event.title}
                    </h3>
                    
                    {event.description && (
                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {event.description}
                      </p>
                    )}

                    <div className="space-y-2 mb-6">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <CalendarIcon className="w-4 h-4" />
                        <span>
                          {new Date(event.start_time).toLocaleDateString()} at{' '}
                          {new Date(event.start_time).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      
                      {event.location && (
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <MapPinIcon className="w-4 h-4" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                      
                      {event.capacity && (
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <UserGroupIcon className="w-4 h-4" />
                          <span>{event.capacity} spots available</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <StarSolidIcon key={i} className="w-4 h-4 text-yellow-400" />
                          ))}
                        </div>
                        <span className="text-sm text-gray-500">4.8 (24)</span>
                      </div>
                      
                      <Link
                        to={`/events/${event.id}`}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More Button */}
        {filteredEvents.length > 0 && (
          <div className="text-center mt-12">
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-900 px-8 py-3 rounded-lg font-medium transition-colors">
              Load More Events
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default EventDiscovery;
