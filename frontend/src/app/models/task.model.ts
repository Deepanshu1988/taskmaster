export interface Task {
  [x: string]: any;
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  progress: number;
  dueDate?: string | null;
  due_date?: string | null;  // Added for backend compatibility
  assigned_to?: number;
  created_at?: string;
  project_id?: number;
  created_by?: number;
}
