export interface User {
  id: number;
  email: string;
  full_name?: string;
  is_active: boolean;
  roles: string[];
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions: string[];
}

export interface Permission {
  id: number;
  name: string;
  description?: string;
}

export interface Event {
  id: number;
  type: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  data?: Record<string, any>;
  capacity?: number;
  is_published: boolean;
  created_by_user_id?: number;
  created_at: string;
  updated_at: string;
}

export interface EventCreate {
  type: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  data?: Record<string, any>;
  capacity?: number;
  is_published: boolean;
}

export interface UserCreate {
  email: string;
  full_name?: string;
  password: string;
}

export interface UserUpdate {
  full_name?: string;
  password?: string;
  is_active?: boolean;
}

export interface RoleCreate {
  name: string;
  description?: string;
}

export interface PermissionCreate {
  name: string;
  description?: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface EventTypes {
  [key: string]: string;
}