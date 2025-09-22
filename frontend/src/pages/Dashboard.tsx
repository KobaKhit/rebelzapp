import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';
import { eventsApi, usersApi, rolesApi } from '../lib/api';
import {
  CalendarIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import Layout from '../components/Layout';

const Dashboard: React.FC = () => {
  const { user, hasPermission } = useAuth();

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.getEvents(),
    enabled: hasPermission('view_events'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getUsers(),
    enabled: hasPermission('manage_users'),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.getRoles(),
    enabled: hasPermission('manage_roles'),
  });

  const upcomingEvents = events
    .filter(event => new Date(event.start_time) > new Date())
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 5);

  const stats = [
    {
      name: 'Total Events',
      value: events.length,
      icon: CalendarIcon,
      color: 'bg-blue-500',
      show: hasPermission('view_events'),
    },
    {
      name: 'Active Users',
      value: users.filter(u => u.is_active).length,
      icon: UserGroupIcon,
      color: 'bg-green-500',
      show: hasPermission('manage_users'),
    },
    {
      name: 'Roles',
      value: roles.length,
      icon: ShieldCheckIcon,
      color: 'bg-purple-500',
      show: hasPermission('manage_roles'),
    },
    {
      name: 'Upcoming Events',
      value: upcomingEvents.length,
      icon: ClockIcon,
      color: 'bg-orange-500',
      show: hasPermission('view_events'),
    },
  ].filter(stat => stat.show);

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">
              Welcome back, {user?.full_name || user?.email}!
            </h1>
            <p className="mt-2 text-sm text-gray-700">
              Here's what's happening in your organization.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.name}
                className="relative overflow-hidden rounded-lg bg-white px-4 pt-5 pb-12 shadow sm:px-6 sm:pt-6"
              >
                <dt>
                  <div className={`absolute rounded-md p-3 ${stat.color}`}>
                    <stat.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  <p className="ml-16 truncate text-sm font-medium text-gray-500">
                    {stat.name}
                  </p>
                </dt>
                <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </dd>
              </div>
            ))}
          </div>
        </div>

        {hasPermission('view_events') && upcomingEvents.length > 0 && (
          <div className="mt-8">
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Upcoming Events
                </h3>
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium text-gray-900">{event.title}</h4>
                        <p className="text-sm text-gray-500">
                          {new Date(event.start_time).toLocaleDateString()} at{' '}
                          {new Date(event.start_time).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        {event.location && (
                          <p className="text-sm text-gray-500">📍 {event.location}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          event.type === 'class' ? 'bg-blue-100 text-blue-800' :
                          event.type === 'sport_class' ? 'bg-green-100 text-green-800' :
                          event.type === 'clinic' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {event.type}
                        </span>
                        {!event.is_published && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Draft
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {hasPermission('manage_users') && (
          <div className="mt-8">
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Recent User Activity
                </h3>
                <div className="text-sm text-gray-500">
                  {users.length} total users, {users.filter(u => u.is_active).length} active
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;