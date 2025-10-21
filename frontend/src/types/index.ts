export interface User {
  id: number;
  email: string;
  full_name?: string;
  profile_picture?: string;
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
  data?: Record<string, unknown>;
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
  data?: Record<string, unknown>;
  capacity?: number;
  is_published: boolean;
}

export interface EventUpdate {
  title?: string;
  description?: string;
  location?: string;
  start_time?: string;
  end_time?: string;
  data?: Record<string, unknown>;
  capacity?: number;
  is_published?: boolean;
}


export interface RoleCreate {
  name: string;
  description?: string;
}

export interface PermissionCreate {
  name: string;
  description?: string;
}


export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface EventTypes {
  [key: string]: string;
}

export interface Registration {
  id: number;
  event_id: number;
  user_id: number;
  status: string;
  registration_date: string;
  notes?: string;
  emergency_contact?: string;
  dietary_restrictions?: string;
  special_needs?: string;
  // Backend only returns these fields, not the full event object
  user_email?: string;
  user_full_name?: string;
  event_title?: string;
  // We'll need to fetch the full event separately if needed
  event?: Event;
}

export interface RegistrationCreate {
  event_id: number;
  notes?: string;
  emergency_contact?: string;
  dietary_restrictions?: string;
  special_needs?: string;
}

// Chat types
export interface ChatGroup {
  id: number;
  name: string;
  description?: string;
  is_private: boolean;
  group_type?: 'user_created' | 'admin_managed' | 'instructor_managed';
  created_by_user_id?: number;
  created_at: string;
  updated_at: string;
  members?: ChatMember[];
  last_message?: ChatMessageResponse;
}

export interface ChatMember {
  user_id: number;
  group_id: number;
  is_admin: boolean;
  joined_at: string;
  user?: User;
}

export interface ChatMessageResponse {
  id: number;
  group_id: number;
  user_id: number;
  content: string;
  message_type: string;
  created_at: string;
  user?: User;
}

export interface ChatGroupCreate {
  name: string;
  description?: string;
  is_private: boolean;
}

export interface ChatGroupUpdate {
  name?: string;
  description?: string;
  is_private?: boolean;
}

export interface ManagedChatGroupCreate {
  name: string;
  description?: string;
  is_private: boolean;
  group_type: 'admin_managed' | 'instructor_managed';
  member_ids: number[];
}