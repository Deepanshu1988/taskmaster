export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user'| 'manager';
  department: string;
  position: string;
  phone: string;
  avatar?: string;
  status: 'active' | 'inactive';
  assignedTasks: number;
  created_at?: string;
}