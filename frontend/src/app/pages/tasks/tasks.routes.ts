// frontend/src/app/pages/tasks/tasks.routes.ts
import { Routes } from '@angular/router';
import { TaskListComponent } from './task-list/task-list.component';
import { AuthGuard } from '../../guards/auth.guard';

export const TASK_ROUTES: Routes = [
  {
    path: 'tasks',
    component: TaskListComponent,
    canActivate: [AuthGuard]
  }
];