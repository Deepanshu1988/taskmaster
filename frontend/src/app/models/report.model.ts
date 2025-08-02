export interface TimeReportEntry {
    taskName: string;
    userName: string;
    projectName: string;
    departmentName: string;
    duration: number;
  }
  
  export interface TaskCompletion {
    count: number;
    stats: { label: string; value: number }[];
  }
  
  export interface UserInfo {
    id: number;
    isAdmin: boolean;
    name: string;
  }

  export interface TaskSummary {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
  }

  export interface UserProductivity {
    id: number;
    name: string;
    email: string;
    tasksCompleted: number;
    totalTasks: number;
  }

  export interface ProjectStat {
    id: number;
    name: string;
    totalTasks: number;
    completedTasks: number;
  }

  export interface DepartmentStat {
    id: number;
    name: string;
    tasksCount: number;
  }

  export interface ReportFilters {
    userId?: number;
    projectId?: number;
    departmentId?: number;
    startDate?: string;
    endDate?: string;
  }

  export interface ReportResponse {
    taskSummary: {
      totalTasks: number;
      completedTasks: number;
      completionRate: number;
    };
    userProductivity: UserProductivity[];
    projectStats: any[]; // Update this with proper type if needed
    departmentStats: any[]; // Update this with proper type if needed
  }