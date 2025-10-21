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
  ChatGroup,
  ChatGroupCreate,
  ChatGroupUpdate,
  ChatMessageResponse,
  ManagedChatGroupCreate,
} from '../types';
import type { UserCreate, UserUpdate, Token } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// For unified deployment, use /api prefix when served from same domain
const isUnifiedDeployment = !import.meta.env.VITE_API_BASE_URL || 
  import.meta.env.VITE_API_BASE_URL === window.location.origin;

const api = axios.create({
  baseURL: isUnifiedDeployment ? '/api' : API_BASE_URL,
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

  deleteUser: async (id: number): Promise<void> => {
    await api.delete(`/users/${id}`);
  },

  uploadProfilePicture: async (file: File): Promise<User> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<User>('/users/upload-profile-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
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
export interface AIResponse {
  response: string;
  suggestions?: string[];
}

export interface HelpTopic {
  id: string;
  title: string;
  description: string;
  category: string;
}

export const aiApi = {
  chat: async (messages: ChatMessage[]): Promise<AIResponse> => {
    const response = await api.post<AIResponse>('/ai/chat', { messages });
    return response.data;
  },

  getSuggestions: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/ai/suggestions');
    return response.data;
  },

  getHelpTopics: async (): Promise<HelpTopic[]> => {
    const response = await api.get<HelpTopic[]>('/ai/help/topics');
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

// Chat API
export const chatApi = {
  // Groups
  getGroups: async (): Promise<ChatGroup[]> => {
    const response = await api.get<ChatGroup[]>('/chat/groups');
    return response.data;
  },

  getGroup: async (id: number): Promise<ChatGroup> => {
    const response = await api.get<ChatGroup>(`/chat/groups/${id}`);
    return response.data;
  },

  createGroup: async (groupData: ChatGroupCreate): Promise<ChatGroup> => {
    const response = await api.post<ChatGroup>('/chat/groups', groupData);
    return response.data;
  },

  updateGroup: async (id: number, groupData: ChatGroupUpdate): Promise<ChatGroup> => {
    const response = await api.put<ChatGroup>(`/chat/groups/${id}`, groupData);
    return response.data;
  },

  deleteGroup: async (id: number): Promise<void> => {
    await api.delete(`/chat/groups/${id}`);
  },

  searchPublicGroups: async (query: string): Promise<ChatGroup[]> => {
    const response = await api.get<ChatGroup[]>(`/chat/search/groups?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  joinGroup: async (id: number): Promise<void> => {
    await api.post(`/chat/groups/${id}/join`);
  },

  // Members
  addMember: async (groupId: number, userId: number, isAdmin = false): Promise<void> => {
    await api.post(`/chat/groups/${groupId}/members`, { user_id: userId, is_admin: isAdmin });
  },

  removeMember: async (groupId: number, userId: number): Promise<void> => {
    await api.delete(`/chat/groups/${groupId}/members/${userId}`);
  },

  // Messages
  getMessages: async (groupId: number, skip = 0, limit = 50): Promise<ChatMessageResponse[]> => {
    const response = await api.get<ChatMessageResponse[]>(`/chat/groups/${groupId}/messages?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  sendMessage: async (groupId: number, content: string, messageType = 'text'): Promise<ChatMessageResponse> => {
    const response = await api.post<ChatMessageResponse>(`/chat/groups/${groupId}/messages`, {
      group_id: groupId,
      content,
      message_type: messageType
    });
    return response.data;
  },
};

// Admin Chat API
export const adminChatApi = {
  // Admin/Instructor managed groups
  createManagedGroup: async (groupData: ManagedChatGroupCreate): Promise<ChatGroup> => {
    const response = await api.post<ChatGroup>('/chat/admin/groups', groupData);
    return response.data;
  },

  getManagedGroups: async (): Promise<ChatGroup[]> => {
    const response = await api.get<ChatGroup[]>('/chat/admin/groups');
    return response.data;
  },

  getAllManagedGroups: async (): Promise<ChatGroup[]> => {
    const response = await api.get<ChatGroup[]>('/chat/admin/groups/all');
    return response.data;
  },

  updateManagedGroup: async (id: number, groupData: ChatGroupUpdate): Promise<ChatGroup> => {
    const response = await api.put<ChatGroup>(`/chat/admin/groups/${id}`, groupData);
    return response.data;
  },

  deleteManagedGroup: async (id: number): Promise<void> => {
    await api.delete(`/chat/admin/groups/${id}`);
  },

  assignUserToGroup: async (groupId: number, userId: number): Promise<void> => {
    await api.post(`/chat/admin/groups/${groupId}/members/${userId}`);
  },

  removeUserFromGroup: async (groupId: number, userId: number): Promise<void> => {
    await api.delete(`/chat/admin/groups/${groupId}/members/${userId}`);
  },
};

export default api;