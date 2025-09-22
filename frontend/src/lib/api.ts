import axios from 'axios';
import type {
  User,
  Role,
  Permission,
  Event,
  EventCreate,
  EventUpdate,
  RoleCreate,
  PermissionCreate,
  ChatMessage,
  EventTypes,
  Registration,
  RegistrationCreate,
} from '../types';
import type { UserCreate, UserUpdate, Token } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (email: string, password: string): Promise<Token> => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    
    const response = await api.post<Token>('/auth/token', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  },

  signup: async (userData: UserCreate): Promise<User> => {
    const response = await api.post<User>('/auth/signup', userData);
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },
};

// Users API
export const usersApi = {
  getUsers: async (): Promise<User[]> => {
    const response = await api.get<User[]>('/users/');
    return response.data;
  },

  getUser: async (id: number): Promise<User> => {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  },

  createUser: async (userData: UserCreate): Promise<User> => {
    const response = await api.post<User>('/users/', userData);
    return response.data;
  },

  updateUser: async (id: number, userData: UserUpdate): Promise<User> => {
    const response = await api.patch<User>(`/users/${id}`, userData);
    return response.data;
  },

  setUserRoles: async (id: number, roles: string[]): Promise<User> => {
    const response = await api.post<User>(`/users/${id}/roles`, roles);
    return response.data;
  },
};

// Roles API
export const rolesApi = {
  getRoles: async (): Promise<Role[]> => {
    const response = await api.get<Role[]>('/roles/');
    return response.data;
  },

  getRole: async (id: number): Promise<Role> => {
    const response = await api.get<Role>(`/roles/${id}`);
    return response.data;
  },

  createRole: async (roleData: RoleCreate): Promise<Role> => {
    const response = await api.post<Role>('/roles/', roleData);
    return response.data;
  },

  updateRole: async (id: number, roleData: Partial<RoleCreate>): Promise<Role> => {
    const response = await api.patch<Role>(`/roles/${id}`, roleData);
    return response.data;
  },

  deleteRole: async (id: number): Promise<void> => {
    await api.delete(`/roles/${id}`);
  },

  setRolePermissions: async (id: number, permissions: string[]): Promise<Role> => {
    const response = await api.post<Role>(`/roles/${id}/permissions`, permissions);
    return response.data;
  },
};

// Permissions API
export const permissionsApi = {
  getPermissions: async (): Promise<Permission[]> => {
    const response = await api.get<Permission[]>('/permissions/');
    return response.data;
  },

  createPermission: async (permissionData: PermissionCreate): Promise<Permission> => {
    const response = await api.post<Permission>('/permissions/', permissionData);
    return response.data;
  },

  deletePermission: async (id: number): Promise<void> => {
    await api.delete(`/permissions/${id}`);
  },
};

// Events API
export const eventsApi = {
  getEvents: async (type?: string): Promise<Event[]> => {
    const params = type ? { type } : {};
    const response = await api.get<Event[]>('/events/', { params });
    return response.data;
  },

  getEvent: async (id: number): Promise<Event> => {
    const response = await api.get<Event>(`/events/${id}`);
    return response.data;
  },

  createEvent: async (eventData: EventCreate): Promise<Event> => {
    const response = await api.post<Event>('/events/', eventData);
    return response.data;
  },

  updateEvent: async (id: number, eventData: EventUpdate): Promise<Event> => {
    const response = await api.patch<Event>(`/events/${id}`, eventData);
    return response.data;
  },

  deleteEvent: async (id: number): Promise<void> => {
    await api.delete(`/events/${id}`);
  },

  getEventTypes: async (): Promise<EventTypes> => {
    const response = await api.get<EventTypes>('/events/types');
    return response.data;
  },
};

// AI API
export const aiApi = {
  chat: async (messages: ChatMessage[]): Promise<any> => {
    const response = await api.post('/ai/chat', { messages });
    return response.data;
  },

  getSuggestions: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/ai/suggestions');
    return response.data;
  },

  getHelpTopics: async (): Promise<any[]> => {
    const response = await api.get<any[]>('/ai/help/topics');
    return response.data;
  },
};

// Registrations API
export const registrationsApi = {
  getMyRegistrations: async (): Promise<Registration[]> => {
    const response = await api.get<Registration[]>('/registrations/my');
    return response.data;
  },

  registerForEvent: async (eventId: number, registrationData: Omit<RegistrationCreate, 'event_id'>): Promise<Registration> => {
    const response = await api.post<Registration>('/registrations/', {
      event_id: eventId,
      ...registrationData
    });
    return response.data;
  },

  updateRegistration: async (id: number, updates: Partial<RegistrationCreate>): Promise<Registration> => {
    const response = await api.patch<Registration>(`/registrations/${id}`, updates);
    return response.data;
  },

  cancelRegistration: async (id: number): Promise<void> => {
    await api.delete(`/registrations/${id}`);
  },
};

export default api;