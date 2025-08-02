export interface Project {
  id?: string;
  name: string;
  description?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  comments?: string;
  progress?: number;
  // Add other project-related properties as needed
}