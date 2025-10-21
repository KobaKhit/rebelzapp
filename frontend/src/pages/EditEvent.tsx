import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { eventsApi } from '../lib/api';
import type { EventCreate, EventUpdate } from '../types/index';
import Layout from '../components/Layout';
import {
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  UserGroupIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

// Event type field definitions (same as NewEvent)
const EVENT_TYPE_FIELDS: Record<string, Array<{
  name: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'textarea' | 'checkbox' | 'datetime-local';
  required?: boolean;
  options?: Array<{value: string, label: string}>;
  placeholder?: string;
  description?: string;
}>> = {
  class: [
    { name: 'subject', label: 'Subject', type: 'text', required: true, placeholder: 'e.g., Mathematics, Science, History' },
    { name: 'grade_level', label: 'Grade Level', type: 'select', options: [
      { value: 'preschool', label: 'Preschool' },
      { value: 'kindergarten', label: 'Kindergarten' },
      { value: 'grade_1', label: 'Grade 1' },
      { value: 'grade_2', label: 'Grade 2' },
      { value: 'grade_3', label: 'Grade 3' },
      { value: 'grade_4', label: 'Grade 4' },
      { value: 'grade_5', label: 'Grade 5' },
      { value: 'grade_6', label: 'Grade 6' },
      { value: 'grade_7', label: 'Grade 7' },
      { value: 'grade_8', label: 'Grade 8' },
      { value: 'grade_9', label: 'Grade 9' },
      { value: 'grade_10', label: 'Grade 10' },
      { value: 'grade_11', label: 'Grade 11' },
      { value: 'grade_12', label: 'Grade 12' },
      { value: 'adult', label: 'Adult' },
    ]},
    { name: 'instructor', label: 'Instructor', type: 'text', placeholder: 'Instructor name' },
    { name: 'max_students', label: 'Max Students', type: 'number', placeholder: 'Maximum number of students' },
  ],
  sport_class: [
    { name: 'sport', label: 'Sport/Activity', type: 'text', required: true, placeholder: 'e.g., Soccer, Basketball, Swimming' },
    { name: 'skill_level', label: 'Skill Level', type: 'select', options: [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'expert', label: 'Expert' },
    ]},
    { name: 'coach', label: 'Coach', type: 'text', placeholder: 'Coach or instructor name' },
    { name: 'age_group', label: 'Age Group', type: 'text', placeholder: 'e.g., 6-8 years, Adults' },
  ],
  workshop: [
    { name: 'workshop_type', label: 'Workshop Type', type: 'text', required: true, placeholder: 'e.g., Coding, Art, Music' },
    { name: 'skill_level', label: 'Skill Level', type: 'select', options: [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'expert', label: 'Expert' },
    ]},
    { name: 'facilitator', label: 'Facilitator', type: 'text', placeholder: 'Workshop facilitator name' },
  ],
  seminar: [
    { name: 'topic', label: 'Topic', type: 'text', required: true, placeholder: 'Seminar topic' },
    { name: 'speaker', label: 'Speaker', type: 'text', placeholder: 'Speaker name' },
    { name: 'recording_available', label: 'Recording Available', type: 'checkbox', description: 'Will a recording be available after the event?' },
  ],
  camp: [
    { name: 'camp_type', label: 'Camp Type', type: 'text', required: true, placeholder: 'e.g., Summer Camp, Science Camp' },
    { name: 'age_range', label: 'Age Range', type: 'text', required: true, placeholder: 'e.g., 8-12 years' },
    { name: 'daily_schedule', label: 'Daily Schedule', type: 'textarea', placeholder: 'Typical daily schedule' },
    { name: 'extended_care', label: 'Extended Care Available', type: 'checkbox', description: 'Is extended care available?' },
  ],
  competition: [
    { name: 'competition_type', label: 'Competition Type', type: 'text', required: true, placeholder: 'e.g., Math Competition, Spelling Bee' },
    { name: 'rules', label: 'Rules', type: 'textarea', placeholder: 'Competition rules and guidelines' },
    { name: 'registration_deadline', label: 'Registration Deadline', type: 'datetime-local', description: 'Deadline for registration' },
    { name: 'entry_fee', label: 'Entry Fee', type: 'number', placeholder: 'Entry fee (leave blank if free)' },
  ],
  community: [
    { name: 'event_type', label: 'Event Type', type: 'text', required: true, placeholder: 'e.g., Fundraiser, Social Gathering' },
    { name: 'organizer', label: 'Organizer', type: 'text', placeholder: 'Event organizer name' },
    { name: 'special_requirements', label: 'Special Requirements', type: 'textarea', placeholder: 'Any special requirements or notes' },
  ],
  conference: [
    { name: 'conference_type', label: 'Conference Type', type: 'text', required: true, placeholder: 'e.g., Educational, Professional' },
    { name: 'keynote_speaker', label: 'Keynote Speaker', type: 'text', placeholder: 'Main speaker name' },
    { name: 'track', label: 'Track/Theme', type: 'text', placeholder: 'Conference track or theme' },
  ],
  event: [
    { name: 'event_type', label: 'Event Type', type: 'text', placeholder: 'Type of event' },
    { name: 'organizer', label: 'Organizer', type: 'text', placeholder: 'Event organizer' },
  ]
};

const EditEvent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<EventCreate>({
    type: '',
    title: '',
    description: '',
    location: '',
    start_time: '',
    end_time: '',
    capacity: undefined,
    is_published: false,
    data: {},
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch the event to edit
  const { data: event, isLoading: eventLoading, error: eventError } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.getEvent(parseInt(id!)),
    enabled: !!id,
  });

  const { data: eventTypes = {} } = useQuery({
    queryKey: ['event-types'],
    queryFn: () => eventsApi.getEventTypes(),
  });

  // Populate form when event data is loaded
  useEffect(() => {
    if (event) {
      setFormData({
        type: event.type,
        title: event.title,
        description: event.description || '',
        location: event.location || '',
        start_time: formatDateTimeLocal(new Date(event.start_time)),
        end_time: formatDateTimeLocal(new Date(event.end_time)),
        capacity: event.capacity || undefined,
        is_published: event.is_published,
        data: event.data || {},
      });
    }
  }, [event]);

  const updateMutation = useMutation({
    mutationFn: (eventData: EventUpdate) => eventsApi.updateEvent(parseInt(id!), eventData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      navigate('/admin/events');
    },
    onError: (error: unknown) => {
      console.error('Error updating event:', error);
      const err = error as { response?: { data?: { detail?: string } } };
      if (err.response?.data?.detail) {
        setErrors({ general: err.response.data.detail });
      } else {
        setErrors({ general: 'Failed to update event. Please try again.' });
      }
    },
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (name.startsWith('data.')) {
      // Handle data fields
      const fieldName = name.replace('data.', '');
      let processedValue: string | number | boolean | undefined = value;
      
      if (type === 'checkbox') {
        processedValue = (e.target as HTMLInputElement).checked;
      } else if (type === 'number') {
        processedValue = value ? parseFloat(value) : '';
      }
      
      setFormData(prev => ({
        ...prev,
        data: { ...prev.data, [fieldName]: processedValue },
      }));
    } else {
      // Handle regular fields
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
                 name === 'capacity' ? (value ? parseInt(value) : undefined) : value,
      }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.type) newErrors.type = 'Event type is required';
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.start_time) newErrors.start_time = 'Start time is required';
    if (!formData.end_time) newErrors.end_time = 'End time is required';

    if (formData.start_time && formData.end_time) {
      if (new Date(formData.start_time) >= new Date(formData.end_time)) {
        newErrors.end_time = 'End time must be after start time';
      }
    }

    if (formData.capacity && formData.capacity < 1) {
      newErrors.capacity = 'Capacity must be at least 1';
    }

    // Validate event type specific fields
    const typeFields = EVENT_TYPE_FIELDS[formData.type] || [];
    typeFields.forEach(field => {
      if (field.required) {
        const value = formData.data?.[field.name];
        if (!value || (typeof value === 'string' && !value.trim())) {
          newErrors[`data.${field.name}`] = `${field.label} is required`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Clean up the data object by removing empty values
    const cleanedData = Object.entries(formData.data || {}).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, unknown>);

    updateMutation.mutate({
      title: formData.title.trim(),
      description: formData.description?.trim() || undefined,
      location: formData.location?.trim() || undefined,
      start_time: formData.start_time,
      end_time: formData.end_time,
      capacity: formData.capacity,
      is_published: formData.is_published,
      data: cleanedData,
    });
  };

  const formatDateTimeLocal = (date: Date): string => {
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  // Render dynamic fields based on event type
  const renderDynamicFields = () => {
    if (!formData.type || !EVENT_TYPE_FIELDS[formData.type]) {
      return null;
    }

    const fields = EVENT_TYPE_FIELDS[formData.type];
    
    return (
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl p-6 mt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {eventTypes[formData.type]} Details
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {fields.map((field) => {
            const fieldName = `data.${field.name}`;
            const fieldValue = formData.data?.[field.name] || '';
            const fieldError = errors[fieldName];

            return (
              <div key={field.name} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <label htmlFor={fieldName} className="block text-sm font-medium text-gray-700 mb-2">
                  {field.label} {field.required && '*'}
                </label>
                
                {field.type === 'text' && (
                  <input
                    type="text"
                    id={fieldName}
                    name={fieldName}
                    value={fieldValue || ''}
                    onChange={handleInputChange}
                    placeholder={field.placeholder}
                    className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${
                      fieldError ? 'ring-red-300' : 'ring-gray-300'
                    } placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6`}
                  />
                )}
                
                {field.type === 'textarea' && (
                  <textarea
                    id={fieldName}
                    name={fieldName}
                    rows={3}
                    value={fieldValue || ''}
                    onChange={handleInputChange}
                    placeholder={field.placeholder}
                    className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${
                      fieldError ? 'ring-red-300' : 'ring-gray-300'
                    } placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6`}
                  />
                )}
                
                {field.type === 'select' && (
                  <select
                    id={fieldName}
                    name={fieldName}
                    value={fieldValue || ''}
                    onChange={handleInputChange}
                    className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${
                      fieldError ? 'ring-red-300' : 'ring-gray-300'
                    } focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6`}
                  >
                    <option value="">Select {field.label.toLowerCase()}</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
                
                {field.type === 'number' && (
                  <input
                    type="number"
                    id={fieldName}
                    name={fieldName}
                    value={fieldValue || ''}
                    onChange={handleInputChange}
                    placeholder={field.placeholder}
                    className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${
                      fieldError ? 'ring-red-300' : 'ring-gray-300'
                    } placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6`}
                  />
                )}
                
                {field.type === 'datetime-local' && (
                  <input
                    type="datetime-local"
                    id={fieldName}
                    name={fieldName}
                    value={fieldValue || ''}
                    onChange={handleInputChange}
                    className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${
                      fieldError ? 'ring-red-300' : 'ring-gray-300'
                    } focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6`}
                  />
                )}
                
                {field.type === 'checkbox' && (
                  <div className="flex items-center">
                    <input
                      id={fieldName}
                      name={fieldName}
                      type="checkbox"
                      checked={!!fieldValue}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                    />
                    <label htmlFor={fieldName} className="ml-2 block text-sm text-gray-700">
                      {field.description || field.label}
                    </label>
                  </div>
                )}
                
                {fieldError && <p className="mt-1 text-sm text-red-600">{fieldError}</p>}
                {field.description && field.type !== 'checkbox' && (
                  <p className="mt-1 text-xs text-gray-500">{field.description}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (eventLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    );
  }

  if (eventError || !event) {
    return (
      <Layout>
        <div className="px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => navigate('/events')}
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Back to Events
            </button>
          </div>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900">Event Not Found</h1>
            <p className="mt-2 text-sm text-gray-600">
              The event you're looking for doesn't exist or you don't have permission to edit it.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/events')}
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Events
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Event</h1>
          <p className="mt-2 text-sm text-gray-600">
            Update the event details below.
          </p>
        </div>

        {errors.general && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{errors.general}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Event Type - Read Only */}
              <div className="sm:col-span-2">
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                  Event Type
                </label>
                <div className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 bg-gray-50 sm:text-sm sm:leading-6">
                  {eventTypes[formData.type] || formData.type}
                </div>
                <p className="mt-1 text-xs text-gray-500">Event type cannot be changed after creation</p>
              </div>

              {/* Title */}
              <div className="sm:col-span-2">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  <CalendarIcon className="h-4 w-4 inline mr-1" />
                  Event Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter event title"
                  className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${
                    errors.title ? 'ring-red-300' : 'ring-gray-300'
                  } placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6`}
                />
                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter event description (optional)"
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>

              {/* Location */}
              <div className="sm:col-span-2">
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPinIcon className="h-4 w-4 inline mr-1" />
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Enter event location (optional)"
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>

              {/* Start Time */}
              <div>
                <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-2">
                  <ClockIcon className="h-4 w-4 inline mr-1" />
                  Start Time *
                </label>
                <input
                  type="datetime-local"
                  id="start_time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleInputChange}
                  className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${
                    errors.start_time ? 'ring-red-300' : 'ring-gray-300'
                  } focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6`}
                />
                {errors.start_time && <p className="mt-1 text-sm text-red-600">{errors.start_time}</p>}
              </div>

              {/* End Time */}
              <div>
                <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-2">
                  <ClockIcon className="h-4 w-4 inline mr-1" />
                  End Time *
                </label>
                <input
                  type="datetime-local"
                  id="end_time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleInputChange}
                  className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${
                    errors.end_time ? 'ring-red-300' : 'ring-gray-300'
                  } focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6`}
                />
                {errors.end_time && <p className="mt-1 text-sm text-red-600">{errors.end_time}</p>}
              </div>

              {/* Capacity */}
              <div>
                <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-2">
                  <UserGroupIcon className="h-4 w-4 inline mr-1" />
                  Capacity
                </label>
                <input
                  type="number"
                  id="capacity"
                  name="capacity"
                  min="1"
                  value={formData.capacity || ''}
                  onChange={handleInputChange}
                  placeholder="Unlimited"
                  className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${
                    errors.capacity ? 'ring-red-300' : 'ring-gray-300'
                  } placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6`}
                />
                {errors.capacity && <p className="mt-1 text-sm text-red-600">{errors.capacity}</p>}
                <p className="mt-1 text-xs text-gray-500">Leave empty for unlimited capacity</p>
              </div>

              {/* Published */}
              <div>
                <div className="flex items-center">
                  <input
                    id="is_published"
                    name="is_published"
                    type="checkbox"
                    checked={formData.is_published}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                  />
                  <label htmlFor="is_published" className="ml-2 block text-sm text-gray-700">
                    Published
                  </label>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Published events are visible to users and allow registrations
                </p>
              </div>
            </div>
          </div>

          {/* Dynamic Event Type Fields */}
          {renderDynamicFields()}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/admin/events')}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateMutation.isPending ? 'Updating...' : 'Update Event'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default EditEvent;
