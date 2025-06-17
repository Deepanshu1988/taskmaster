import { TaskComment } from '../services/task.service';
export interface Task {
  [x: string]: any;
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  progress: number;  // Keep this as is for frontend
  Progress?: number;  // Add this for backend compatibility
  dueDate?: string | null;
  due_date?: string | null;
  assigned_to?: number;
  created_at?: string;
  project_id?: number;
  created_by?: number;
  comments?: TaskComment[];
  total_time?: number;
  last_time_tracked?: string | null;
}
