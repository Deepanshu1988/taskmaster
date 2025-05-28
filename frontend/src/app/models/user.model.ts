// models/user.model.ts
export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'manager' | null;  // Allow null
  department?: string;
  position?: string;
  phone?: string;
  avatar?: string;
  status?: 'active' | 'inactive';
  assignedTasks?: number;
  created_at?: string;
}

// Add a type guard to handle null roles
export function hasValidRole(user: User): user is User & { role: NonNullable<User['role']> } {
  return user.role !== null && user.role !== undefined;
}