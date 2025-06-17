import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NotificationSettingsComponent } from './notification-settings/notification-settings.component';

const routes: Routes = [

  {
    path: 'notifications',
    component: NotificationSettingsComponent,
    resolve: {
      // Add any resolvers if needed
    }
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SettingsRoutingModule { }
