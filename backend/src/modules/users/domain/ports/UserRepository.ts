export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  [field: string]: unknown;
}

export interface UserRepository {
  getProfile(userId: string): Promise<UserProfile | null>;
}
