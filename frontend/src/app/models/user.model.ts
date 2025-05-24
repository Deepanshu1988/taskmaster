export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user'| 'manager';
  // Optional fields that might be present in some responses
  department?: string;
  position?: string;
  phone?: string;
  avatar?: string;
  status?: 'active' | 'inactive';
  assignedTasks?: number;
  created_at?: string;
}