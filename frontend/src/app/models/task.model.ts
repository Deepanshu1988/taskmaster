export interface Task {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  progress: number;
  dueDate?: string;
  assigned_to?: number;
  created_at?: string;
  project_id?: number;
  created_by?: number;
}
