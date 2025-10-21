import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';
import { usersApi, registrationsApi, eventsApi } from '../lib/api';
import {
  UserCircleIcon,
  CalendarIcon,
  TrophyIcon,
  AcademicCapIcon,
  FireIcon,
  PresentationChartLineIcon,
  BuildingOfficeIcon,
  UsersIcon,
  ClockIcon,
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  CameraIcon,
} from '@heroicons/react/24/outline';
import {
  StarIcon as StarSolidIcon,
} from '@heroicons/react/24/solid';
import Layout from '../components/Layout';

interface ProfileFormData {
  full_name: string;
  email: string;
}

const UserProfile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'achievements' | 'settings'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<ProfileFormData>({
    full_name: user?.full_name || '',
    email: user?.email || ''
  });

  const { data: myRegistrations = [], error: registrationsError } = useQuery({
    queryKey: ['my-registrations'],
    queryFn: () => registrationsApi.getMyRegistrations(),
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.getEvents(),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormData) => 
      usersApi.updateUser(user!.id, data),
    onSuccess: async () => {
      // Refresh the user data in auth context to update profile immediately
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      setIsEditing(false);
    },
  });

  const uploadProfilePictureMutation = useMutation({
    mutationFn: (file: File) => usersApi.uploadProfilePicture(file),
    onSuccess: async () => {
      // Refresh the user data in auth context to update profile picture immediately
      await refreshUser();
      // Also invalidate queries for other components that might use user data
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    },
    onError: (error) => {
      console.error('Failed to upload profile picture:', error);
    },
  });

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

  // Match registrations with events to get full event data
  const upcomingEvents = myRegistrations
    .map(reg => {
      const event = events.find(e => e.id === reg.event_id);
      return event ? { ...reg, event } : null;
    })
    .filter((reg): reg is NonNullable<typeof reg> => 
      !!(reg?.event?.start_time && new Date(reg.event.start_time) > new Date())
    )
    .sort((a, b) => new Date(a.event.start_time).getTime() - new Date(b.event.start_time).getTime());

  const pastEvents = myRegistrations
    .map(reg => {
      const event = events.find(e => e.id === reg.event_id);
      return event ? { ...reg, event } : null;
    })
    .filter((reg): reg is NonNullable<typeof reg> => 
      !!(reg?.event?.end_time && new Date(reg.event.end_time) < new Date())
    )
    .sort((a, b) => new Date(b.event.end_time).getTime() - new Date(a.event.end_time).getTime());

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      
      uploadProfilePictureMutation.mutate(file);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: UserCircleIcon },
    { id: 'events', label: 'My Events', icon: CalendarIcon },
    { id: 'achievements', label: 'Achievements', icon: TrophyIcon },
    { id: 'settings', label: 'Settings', icon: PencilIcon },
  ];

  // Mock achievements data
  const achievements = [
    {
      id: 1,
      title: 'First Registration',
      description: 'Registered for your first event',
      icon: '🎯',
      earned: true,
      date: '2024-01-15'
    },
    {
      id: 2,
      title: 'Perfect Attendance',
      description: 'Attended 5 events in a row',
      icon: '✅',
      earned: true,
      date: '2024-02-20'
    },
    {
      id: 3,
      title: 'Community Champion',
      description: 'Participated in 10 community events',
      icon: '🏆',
      earned: false,
      progress: 7
    },
    {
      id: 4,
      title: 'Skills Master',
      description: 'Completed advanced training program',
      icon: '🥇',
      earned: false,
      progress: 3
    }
  ];

  const stats = [
    { 
      label: 'Events Registered', 
      value: registrationsError ? '—' : myRegistrations.length, 
      color: 'text-blue-600' 
    },
    { 
      label: 'Events Completed', 
      value: registrationsError ? '—' : pastEvents.length, 
      color: 'text-green-600' 
    },
    { 
      label: 'Upcoming Events', 
      value: registrationsError ? '—' : upcomingEvents.length, 
      color: 'text-orange-600' 
    },
    { 
      label: 'Community Rank', 
      value: '#42', 
      color: 'text-purple-600' 
    },
  ];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Profile Header */}
        <div className="bg-primary rounded-2xl p-4 sm:p-8 mb-6 sm:mb-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 sm:w-40 sm:h-40 bg-secondary bg-opacity-20 rounded-full -mr-16 sm:-mr-20 -mt-16 sm:-mt-20"></div>
          <div className="absolute bottom-0 right-6 sm:right-10 w-16 h-16 sm:w-24 sm:h-24 bg-secondary bg-opacity-20 rounded-full"></div>
          
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-start justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-center space-y-4 sm:space-y-0 sm:space-x-6 w-full sm:w-auto">
              <div className="relative">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center overflow-hidden">
                  {user?.profile_picture ? (
                    <img 
                      src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${user.profile_picture}`}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserCircleIcon className="w-12 h-12 sm:w-16 sm:h-16" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-7 h-7 sm:w-8 sm:h-8 bg-secondary hover:bg-secondary-700 rounded-full flex items-center justify-center transition-all cursor-pointer">
                  <CameraIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureUpload}
                    className="hidden"
                    disabled={uploadProfilePictureMutation.isPending}
                  />
                </label>
                {uploadProfilePictureMutation.isPending && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
              
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">{user?.full_name || 'User'}</h1>
                <p className="text-gray-300 mb-1 text-sm sm:text-base">{user?.email}</p>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Member since January 2024
                </p>
                <div className="flex flex-col sm:flex-row items-center sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 mt-3 sm:mt-4">
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <StarSolidIcon key={i} className="w-3 h-3 sm:w-4 sm:h-4 text-secondary" />
                    ))}
                  </div>
                  <span className="text-xs sm:text-sm">Community Rating: 4.8</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setIsEditing(true)}
              className="bg-secondary hover:bg-secondary-700 px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-medium transition-all flex items-center space-x-2 text-sm sm:text-base w-full sm:w-auto justify-center"
            >
              <PencilIcon className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <div className="text-center">
                <div className={`text-2xl sm:text-3xl font-bold ${stat.color} mb-1 sm:mb-2`}>
                  {stat.value}
                </div>
                <div className="text-gray-600 text-xs sm:text-sm">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 sm:mb-8">
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="flex space-x-4 sm:space-x-8 px-4 sm:px-6 min-w-max">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`flex items-center space-x-2 py-3 sm:py-4 px-2 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-secondary text-secondary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Activity */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                    <div className="space-y-4">
                      {pastEvents.slice(0, 3).map((registration) => {
                        const event = registration.event;
                        const EventIcon = getEventIcon(event.type);
                        
                        return (
                          <div key={registration.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                            <div className={`w-10 h-10 ${getEventColor(event.type)} rounded-lg flex items-center justify-center`}>
                              <EventIcon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{event.title}</h4>
                              <p className="text-sm text-gray-500">
                                Completed on {new Date(event.end_time).toLocaleDateString()}
                              </p>
                            </div>
                            <CheckCircleIcon className="w-5 h-5 text-green-500" />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Upcoming Events */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h3>
                    {upcomingEvents.length > 0 ? (
                      <div className="space-y-4">
                        {upcomingEvents.slice(0, 3).map((registration) => {
                          const event = registration.event;
                          const EventIcon = getEventIcon(event.type);
                          
                          return (
                            <div key={registration.id} className="flex items-center space-x-4 p-3 bg-blue-50 rounded-lg">
                              <div className={`w-10 h-10 ${getEventColor(event.type)} rounded-lg flex items-center justify-center`}>
                                <EventIcon className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{event.title}</h4>
                                <p className="text-sm text-gray-500">
                                  {new Date(event.start_time).toLocaleDateString()} at{' '}
                                  {new Date(event.start_time).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                              <ClockIcon className="w-5 h-5 text-blue-500" />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No upcoming events</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Events Tab */}
            {activeTab === 'events' && (
              <div className="space-y-6">
                {/* Upcoming Events */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">
                    Upcoming Events ({registrationsError ? '—' : upcomingEvents.length})
                  </h3>
                  {!registrationsError && upcomingEvents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {upcomingEvents.map((registration) => {
                        const event = registration.event;
                        const EventIcon = getEventIcon(event.type);
                        
                        return (
                          <div key={registration.id} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-start space-x-4">
                              <div className={`w-12 h-12 ${getEventColor(event.type)} rounded-lg flex items-center justify-center`}>
                                <EventIcon className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 mb-1">{event.title}</h4>
                                <div className="space-y-1 text-sm text-gray-500">
                                  <div className="flex items-center space-x-2">
                                    <CalendarIcon className="w-4 h-4" />
                                    <span>{new Date(event.start_time).toLocaleDateString()}</span>
                                  </div>
                                  {event.location && (
                                    <div className="flex items-center space-x-2">
                                      <MapPinIcon className="w-4 h-4" />
                                      <span>{event.location}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="mt-3">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    registration.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                    registration.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {registration.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : registrationsError ? (
                    <div className="text-center py-8 text-gray-500">
                      <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Unable to load events</p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No upcoming events</p>
                    </div>
                  )}
                </div>

                {/* Past Events */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">
                    Past Events ({registrationsError ? '—' : pastEvents.length})
                  </h3>
                  {!registrationsError && pastEvents.length > 0 ? (
                    <div className="space-y-3">
                      {pastEvents.map((registration) => {
                        const event = registration.event;
                        const EventIcon = getEventIcon(event.type);
                        
                        return (
                          <div key={registration.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                            <div className={`w-10 h-10 ${getEventColor(event.type)} rounded-lg flex items-center justify-center opacity-75`}>
                              <EventIcon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{event.title}</h4>
                              <p className="text-sm text-gray-500">
                                Completed on {new Date(event.end_time).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <CheckCircleIcon className="w-5 h-5 text-green-500" />
                              <button className="text-secondary hover:text-secondary-700 text-sm font-medium">
                                Rate Event
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : registrationsError ? (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircleIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Unable to load events</p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircleIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No completed events yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Achievements Tab */}
            {activeTab === 'achievements' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900">Your Achievements</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className={`p-6 rounded-xl border-2 transition-all ${
                        achievement.earned
                          ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`text-4xl ${achievement.earned ? '' : 'grayscale opacity-50'}`}>
                          {achievement.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className={`font-semibold mb-1 ${
                            achievement.earned ? 'text-gray-900' : 'text-gray-500'
                          }`}>
                            {achievement.title}
                          </h4>
                          <p className={`text-sm mb-3 ${
                            achievement.earned ? 'text-gray-700' : 'text-gray-400'
                          }`}>
                            {achievement.description}
                          </p>
                          
                          {achievement.earned ? (
                            <div className="flex items-center space-x-2 text-sm text-green-600">
                              <CheckCircleIcon className="w-4 h-4" />
                              <span>Earned on {new Date(achievement.date!).toLocaleDateString()}</span>
                            </div>
                          ) : achievement.progress !== undefined ? (
                            <div>
                              <div className="flex justify-between text-sm text-gray-600 mb-1">
                                <span>Progress</span>
                                <span>{achievement.progress}/10</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-secondary h-2 rounded-full"
                                  style={{ width: `${(achievement.progress / 10) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">Not earned yet</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900">Profile Settings</h3>
                
                {/* Profile Picture Section */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Profile Picture</h4>
                  <div className="flex items-center space-x-6">
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                      {user?.profile_picture ? (
                        <img 
                          src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${user.profile_picture}`}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserCircleIcon className="w-12 h-12 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <label className="inline-flex items-center px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-700 transition-colors cursor-pointer">
                        <CameraIcon className="w-4 h-4 mr-2" />
                        {uploadProfilePictureMutation.isPending ? 'Uploading...' : 'Change Picture'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProfilePictureUpload}
                          className="hidden"
                          disabled={uploadProfilePictureMutation.isPending}
                        />
                      </label>
                      <p className="text-sm text-gray-500 mt-2">
                        JPG, PNG or GIF. Max size 5MB.
                      </p>
                    </div>
                  </div>
                </div>
                
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        name="full_name"
                        value={profileData.full_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={profileData.email}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setProfileData({
                          full_name: user?.full_name || '',
                          email: user?.email || ''
                        });
                      }}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="px-6 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-700 transition-colors disabled:opacity-50"
                    >
                      {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Edit Profile</h2>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={profileData.full_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={profileData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="flex-1 bg-secondary text-white py-3 px-4 rounded-lg hover:bg-secondary-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
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

export default UserProfile;
