import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TaskAttachmentsComponent } from './task-attachments/task-attachments.component';

const routes: Routes = [
  {
    path: ':taskId/attachments',
    component: TaskAttachmentsComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TasksRoutingModule { }
