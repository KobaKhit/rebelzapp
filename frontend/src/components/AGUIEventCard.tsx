import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

interface Event {
  id: number;
  title: string;
  type: string;
  start_time: string;
  end_time?: string;
  location?: string;
  capacity?: number;
  status: string;
  description?: string;
}

interface AGUIEventCardProps {
  events: Event[];
  title?: string;
}

export const AGUIEventCard: React.FC<AGUIEventCardProps> = ({ events, title = "Your Events" }) => {
  const navigate = useNavigate();

  const handleEventClick = (eventId: number) => {
    navigate(`/events/${eventId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    };
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'waitlist':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'pending':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  const getEventTypeColor = (type: string) => {
    const colors = {
      'sports_class': 'bg-blue-500',
      'academic_class': 'bg-purple-500',
      'workshop': 'bg-green-500',
      'camp': 'bg-orange-500',
      'competition': 'bg-red-500',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <CalendarIcon className="h-5 w-5 mr-2 text-indigo-600" />
          {title}
        </h3>
      </div>
      
      <div className="p-4 space-y-4">
        {events.length === 0 ? (
          <div className="text-center py-6">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">No events found</p>
          </div>
        ) : (
          events.map((event) => {
            const { date, time } = formatDate(event.start_time);
            
            return (
              <div
                key={event.id}
                onClick={() => handleEventClick(event.id)}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-indigo-300 hover:bg-indigo-50/50 transition-all duration-200 cursor-pointer group"
                title="Click to view event details"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${getEventTypeColor(event.type)}`}></div>
                      <h4 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {event.title}
                      </h4>
                      <span className="text-sm text-gray-500 capitalize">
                        ({event.type.replace('_', ' ')})
                      </span>
                      <ArrowTopRightOnSquareIcon className="h-4 w-4 text-gray-400 group-hover:text-indigo-600 transition-colors ml-auto" />
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                        <span>{date}</span>
                      </div>
                      
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 mr-2 text-gray-400" />
                        <span>{time}</span>
                        {event.end_time && (
                          <span className="ml-2">
                            - {formatDate(event.end_time).time}
                          </span>
                        )}
                      </div>
                      
                      {event.location && (
                        <div className="flex items-center">
                          <MapPinIcon className="h-4 w-4 mr-2 text-gray-400" />
                          <span>{event.location}</span>
                        </div>
                      )}
                      
                      {event.capacity && (
                        <div className="flex items-center">
                          <UserGroupIcon className="h-4 w-4 mr-2 text-gray-400" />
                          <span>Capacity: {event.capacity}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(event.status)}`}>
                    {getStatusIcon(event.status)}
                    <span className="ml-1 capitalize">{event.status}</span>
                  </div>
                </div>
                
                {event.description && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-sm text-gray-600">{event.description}</p>
                  </div>
                )}
                
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 group-hover:text-indigo-500 transition-colors flex items-center">
                    <ArrowTopRightOnSquareIcon className="h-3 w-3 mr-1" />
                    Click to view details
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AGUIEventCard;
