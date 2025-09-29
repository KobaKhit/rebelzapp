import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { eventsApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import Layout from '../components/Layout';
import {
  PlusIcon,
  CalendarIcon,
  MapPinIcon,
  UserGroupIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';

const Events: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<string>('');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', selectedType],
    queryFn: () => eventsApi.getEvents(selectedType || undefined),
  });

  const { data: eventTypes = {} } = useQuery({
    queryKey: ['event-types'],
    queryFn: () => eventsApi.getEventTypes(),
  });

  const deleteMutation = useMutation({
    mutationFn: eventsApi.deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, is_published }: { id: number; is_published: boolean }) =>
      eventsApi.updateEvent(id, { is_published }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleTogglePublish = (id: number, currentStatus: boolean) => {
    const action = currentStatus ? 'unpublish' : 'publish';
    if (window.confirm(`Are you sure you want to ${action} this event?`)) {
      togglePublishMutation.mutate({ id, is_published: !currentStatus });
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Events</h1>
            <p className="mt-2 text-sm text-gray-700">
              Manage all events in your organization.
            </p>
          </div>
          {hasPermission('manage_events') && (
            <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
              <Link
                to="/admin/events/new"
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Event
              </Link>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="mt-6 flex space-x-4">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">All Types</option>
            {Object.entries(eventTypes).map(([key, value]) => (
              <option key={key} value={key}>
                {key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Events Grid */}
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const startDateTime = formatDateTime(event.start_time);
            const endDateTime = formatDateTime(event.end_time);
            
            return (
              <div
                key={event.id}
                className="relative group bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      event.type === 'class' ? 'bg-blue-100 text-blue-800' :
                      event.type === 'sport_class' ? 'bg-green-100 text-green-800' :
                      event.type === 'clinic' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {event.type.replace('_', ' ')}
                    </span>
                    <div className="flex items-center space-x-1">
                      {event.is_published ? (
                        <EyeIcon className="h-4 w-4 text-green-500" title="Published" />
                      ) : (
                        <EyeSlashIcon className="h-4 w-4 text-gray-400" title="Draft" />
                      )}
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {event.title}
                  </h3>
                  
                  {event.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-500">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      <span>
                        {startDateTime.date} • {startDateTime.time}
                        {startDateTime.date !== endDateTime.date && ` - ${endDateTime.date}`}
                        {startDateTime.date === endDateTime.date && startDateTime.time !== endDateTime.time && ` - ${endDateTime.time}`}
                      </span>
                    </div>
                    
                    {event.location && (
                      <div className="flex items-center text-sm text-gray-500">
                        <MapPinIcon className="h-4 w-4 mr-2" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    
                    {event.capacity && (
                      <div className="flex items-center text-sm text-gray-500">
                        <UserGroupIcon className="h-4 w-4 mr-2" />
                        <span>Capacity: {event.capacity}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {hasPermission('manage_events') && (
                  <div className="bg-gray-50 px-6 py-3 flex justify-between items-center">
                    <div className="flex space-x-4">
                      <Link
                        to={`/admin/events/${event.id}/edit`}
                        className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleTogglePublish(event.id, event.is_published)}
                        className={`text-sm font-medium ${
                          event.is_published
                            ? 'text-amber-600 hover:text-amber-900'
                            : 'text-green-600 hover:text-green-900'
                        }`}
                        disabled={togglePublishMutation.isPending}
                      >
                        {togglePublishMutation.isPending
                          ? 'Updating...'
                          : event.is_published
                          ? 'Unpublish'
                          : 'Publish'}
                      </button>
                    </div>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="text-red-600 hover:text-red-900 text-sm font-medium"
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {events.length === 0 && (
          <div className="text-center py-12">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No events</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new event.
            </p>
            {hasPermission('manage_events') && (
              <div className="mt-6">
                <Link
                  to="/admin/events/new"
                  className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  New Event
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Events;