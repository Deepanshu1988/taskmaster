import { TaskComment } from '../services/task.service';
export interface Task {
  [x: string]: any;
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  progress: number;  // Keep this as is for frontend
  Progress?: number;  // For backend compatibility
  dueDate?: string | null;
  due_date?: string | null;  // For backend compatibility
  assigned_to?: number;
  assigned_to_name?: string;
  
  created_at?: string;
  project_id?: number;
  created_by?: number;
  comments?: string;  // This is the field that gets saved to the database
  //comment?: string;   // This is only for the form field
  total_time?: number;
  last_time_tracked?: string | null;
}
