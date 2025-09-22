import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi, registrationsApi } from '../lib/api';
import { useAuth } from '../lib/auth';
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
  HeartIcon,
  ShareIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartSolidIcon,
  StarIcon as StarSolidIcon,
} from '@heroicons/react/24/solid';
import Layout from '../components/Layout';

interface RegistrationFormData {
  notes: string;
  emergency_contact: string;
  dietary_restrictions: string;
  special_needs: string;
}

const EventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [registrationData, setRegistrationData] = useState<RegistrationFormData>({
    notes: '',
    emergency_contact: '',
    dietary_restrictions: '',
    special_needs: ''
  });

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.getEvent(Number(id)),
    enabled: !!id,
  });

  const { data: myRegistrations = [], error: registrationsError } = useQuery({
    queryKey: ['my-registrations'],
    queryFn: () => registrationsApi.getMyRegistrations(),
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegistrationFormData) => 
      registrationsApi.registerForEvent(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-registrations'] });
      setShowRegistrationModal(false);
      setRegistrationData({
        notes: '',
        emergency_contact: '',
        dietary_restrictions: '',
        special_needs: ''
      });
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200 rounded-xl mb-8"></div>
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h1>
          <p className="text-gray-600 mb-6">The event you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/discover')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Events
          </button>
        </div>
      </Layout>
    );
  }

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

  const EventIcon = getEventIcon(event.type);
  const isRegistered = !registrationsError && myRegistrations.some(reg => reg?.event_id === event.id);
  const myRegistration = !registrationsError ? myRegistrations.find(reg => reg?.event_id === event.id) : undefined;
  const isEventPast = new Date(event.end_time) < new Date();
  const isEventFull = event.capacity && myRegistrations.length >= event.capacity;

  const handleRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(registrationData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRegistrationData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className={`relative h-80 rounded-2xl bg-gradient-to-br ${getEventColor(event.type)} mb-8 overflow-hidden`}>
          <div className="absolute inset-0 bg-black bg-opacity-30"></div>
          <div className="relative z-10 h-full flex items-end p-8">
            <div className="text-white">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-white bg-opacity-20 rounded-lg p-3">
                  <EventIcon className="w-8 h-8" />
                </div>
                <span className="bg-white bg-opacity-20 rounded-full px-4 py-2 text-sm font-medium">
                  {event.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
              <h1 className="text-4xl font-bold mb-4">{event.title}</h1>
              <div className="flex items-center space-x-6 text-white text-opacity-90">
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="w-5 h-5" />
                  <span>
                    {new Date(event.start_time).toLocaleDateString()} at{' '}
                    {new Date(event.start_time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {event.location && (
                  <div className="flex items-center space-x-2">
                    <MapPinIcon className="w-5 h-5" />
                    <span>{event.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="absolute top-6 right-6 flex items-center space-x-3">
            <button className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-3 transition-all">
              <HeartIcon className="w-6 h-6 text-white" />
            </button>
            <button className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-3 transition-all">
              <ShareIcon className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Registration Status */}
            {isRegistered && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-center space-x-3">
                  <CheckCircleIcon className="w-8 h-8 text-green-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-green-900">You're Registered!</h3>
                    <p className="text-green-700">
                      Status: <span className="font-medium capitalize">{myRegistration?.status}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Event Description */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Event</h2>
              {event.description ? (
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-700 leading-relaxed">{event.description}</p>
                </div>
              ) : (
                <p className="text-gray-500 italic">No description provided.</p>
              )}
            </div>

            {/* Event Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Event Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <CalendarIcon className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="font-medium text-gray-900">Date & Time</p>
                      <p className="text-gray-600">
                        {new Date(event.start_time).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-gray-600">
                        {new Date(event.start_time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        -{' '}
                        {new Date(event.end_time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {event.location && (
                    <div className="flex items-start space-x-3">
                      <MapPinIcon className="w-5 h-5 text-gray-400 mt-1" />
                      <div>
                        <p className="font-medium text-gray-900">Location</p>
                        <p className="text-gray-600">{event.location}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {event.capacity && (
                    <div className="flex items-start space-x-3">
                      <UserGroupIcon className="w-5 h-5 text-gray-400 mt-1" />
                      <div>
                        <p className="font-medium text-gray-900">Capacity</p>
                        <p className="text-gray-600">
                          {myRegistrations.length} / {event.capacity} registered
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(myRegistrations.length / event.capacity) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start space-x-3">
                    <InformationCircleIcon className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="font-medium text-gray-900">Event Type</p>
                      <p className="text-gray-600 capitalize">
                        {event.type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Event Data */}
            {event.data && Object.keys(event.data).length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Additional Information</h2>
                <div className="space-y-3">
                  {Object.entries(event.data).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 border-b border-gray-100 last:border-b-0">
                      <span className="font-medium text-gray-700 capitalize">
                        {key.replace('_', ' ')}:
                      </span>
                      <span className="text-gray-600">
                        {Array.isArray(value) ? value.join(', ') : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews/Ratings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Reviews & Ratings</h2>
              
              <div className="flex items-center space-x-4 mb-6">
                <div className="flex items-center space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <StarSolidIcon key={i} className="w-6 h-6 text-yellow-400" />
                  ))}
                </div>
                <span className="text-2xl font-bold text-gray-900">4.8</span>
                <span className="text-gray-600">(24 reviews)</span>
              </div>

              <div className="text-gray-500 text-center py-8">
                Reviews and ratings will be available after the event.
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Registration Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
              {isEventPast ? (
                <div className="text-center">
                  <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Event Ended</h3>
                  <p className="text-gray-600">This event has already concluded.</p>
                </div>
              ) : registrationsError ? (
                <div className="text-center">
                  <InformationCircleIcon className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Registration Available</h3>
                  <p className="text-gray-600 mb-6">
                    Unable to check registration status, but you can still register for this event.
                  </p>
                  <button
                    onClick={() => setShowRegistrationModal(true)}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Register Now
                  </button>
                </div>
              ) : isRegistered ? (
                <div className="text-center">
                  <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">You're Registered</h3>
                  <p className="text-gray-600 mb-4">
                    Status: <span className="font-medium capitalize text-green-600">{myRegistration?.status}</span>
                  </p>
                  <button className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium">
                    View Registration Details
                  </button>
                </div>
              ) : isEventFull ? (
                <div className="text-center">
                  <ExclamationTriangleIcon className="w-12 h-12 text-orange-500 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Event Full</h3>
                  <p className="text-gray-600 mb-4">This event has reached capacity.</p>
                  <button className="w-full bg-orange-100 text-orange-700 py-3 px-4 rounded-lg font-medium">
                    Join Waitlist
                  </button>
                </div>
              ) : (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Register for Event</h3>
                  <p className="text-gray-600 mb-6">
                    Secure your spot in this amazing event. Registration is quick and easy!
                  </p>
                  <button
                    onClick={() => setShowRegistrationModal(true)}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Register Now
                  </button>
                </div>
              )}
            </div>

            {/* Event Organizer */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Organizer</h3>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">RB</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Rebelz Basketball</p>
                  <p className="text-sm text-gray-500">Event Organizer</p>
                </div>
              </div>
              <button className="w-full mt-4 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors">
                View Profile
              </button>
            </div>

            {/* Share Event */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Share Event</h3>
              <div className="flex space-x-2">
                <button className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                  Facebook
                </button>
                <button className="flex-1 bg-sky-500 text-white py-2 px-3 rounded-lg hover:bg-sky-600 transition-colors text-sm">
                  Twitter
                </button>
                <button className="flex-1 bg-gray-600 text-white py-2 px-3 rounded-lg hover:bg-gray-700 transition-colors text-sm">
                  Copy Link
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      {showRegistrationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Register for Event</h2>
                <button
                  onClick={() => setShowRegistrationModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleRegistration} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    name="notes"
                    value={registrationData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Any additional notes or questions..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Contact
                  </label>
                  <input
                    type="text"
                    name="emergency_contact"
                    value={registrationData.emergency_contact}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Name and phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dietary Restrictions (Optional)
                  </label>
                  <input
                    type="text"
                    name="dietary_restrictions"
                    value={registrationData.dietary_restrictions}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Any dietary restrictions or allergies"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Needs (Optional)
                  </label>
                  <input
                    type="text"
                    name="special_needs"
                    value={registrationData.special_needs}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Any special accommodations needed"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowRegistrationModal(false)}
                    className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={registerMutation.isPending}
                    className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {registerMutation.isPending ? 'Registering...' : 'Register'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default EventDetails;
