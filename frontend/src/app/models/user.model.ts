export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
  created_at?: string;
}