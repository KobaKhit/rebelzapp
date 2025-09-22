// Separate auth types to avoid any potential circular imports
export interface UserCreate {
  email: string;
  full_name: string;
  password: string;
}

export interface UserUpdate {
  full_name?: string;
  password?: string;
  is_active?: boolean;
}

export interface Token {
  access_token: string;
  token_type: string;
}
