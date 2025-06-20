import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, of, throwError } from 'rxjs';
import { User } from '../models/user.model';
import { map, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:3000/api/users';
  //authService: any;
  // private userId = localStorage.getItem('id')?.trim() || '';


  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // Helper method to get headers with auth token
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Get current user with preferences
  getCurrentUser(): Observable<any> {
    const currentUser = this.authService.currentUserValue;
    const userId = currentUser?.user?.id || currentUser?.id;
    
    if (!userId) {
      return of(null);
    }
  
    return this.http.get<any>(`${this.apiUrl}/${userId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        const userData = response.success ? response.data : response;
        // Ensure notification_preferences is properly formatted
        if (userData.notification_preferences && typeof userData.notification_preferences === 'string') {
          try {
            userData.notification_preferences = JSON.parse(userData.notification_preferences);
          } catch (e) {
            console.error('Error parsing notification_preferences:', e);
            userData.notification_preferences = this.getDefaultPreferences();
          }
        } else if (!userData.notification_preferences) {
          userData.notification_preferences = this.getDefaultPreferences();
        }
        return userData;
      }),
      catchError(error => {
        console.error('Error fetching current user:', error);
        return of({ notification_preferences: this.getDefaultPreferences() });
      })
    );
  }
  
  private getDefaultPreferences() {
    return {
      email: { enabled: true, taskReminders: true, dueDateAlerts: true, statusUpdates: true },
      in_app: { enabled: true, taskReminders: true, mentions: true, statusUpdates: true },
      push: { enabled: false, taskReminders: false, mentions: false }
    };
  }

  // Update notification preferences
  updateNotificationPreferences(preferences: any): Observable<any> {
    console.log('Current User:', this.authService.currentUserValue);
  console.log('Token exists:', !!this.authService.getToken());
  console.log('Token value:', this.authService.getToken());
    const currentUser = this.authService.currentUserValue;
    console.log('Current user object:', JSON.stringify(currentUser, null, 2));
     // Check if user data is in the expected structure
  const userId = currentUser?.user?.id || currentUser?.id;
  console.log('Extracted user ID:', userId); // Add this line
  
  if (!userId) {
    console.error('No user ID found in:', currentUser);
    return throwError(() => new Error('No user is logged in'));
  }
  
    // Get the token
    const token = this.authService.getToken();
    if (!token) {
      return throwError(() => new Error('No authentication token found'));
    }
  
    // Include token in request headers
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
    console.log('Sending request to:', `${this.apiUrl}/${userId}/preferences`);
    return this.http.put<any>(
      `${this.apiUrl}/${userId}/preferences`,
      { notification_preferences: preferences },
      { headers }
    ).pipe(
      map(response => {
        if (response.success && response.data) {
          // Update the current user in auth service and local storage
          const updatedUser = {
            ...currentUser,
            notification_preferences: response.data.notification_preferences
          };
          
          // Update local storage
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
          
          // Update the current user in the auth service
          this.authService['currentUserSubject'].next(updatedUser);
          
          return response;
        }
        return response;
      }),
      catchError(error => {
        console.error('Error updating preferences:', error);
        return throwError(error);
      })
    );
  }
 // Get current user with preferences
 /*getCurrentUser(): Observable<any> {
  const currentUser = this.authService.currentUserValue;
  if (!currentUser?.user?.id) {
    return of(null);
  }

  return this.http.get<any>(
    `${this.apiUrl}/users/${currentUser.user.id}`,
    { headers: this.getAuthHeaders() }
  ).pipe(
    map((response: any) => {
      // Ensure we handle both success: true and direct data responses
      const userData = response.success ? response.data : response;
      return {
        ...userData,
        notificationPreferences: userData.notificationPreferences || {
          email: { enabled: true, taskReminders: true, dueDateAlerts: true, statusUpdates: true },
          in_app: { enabled: true, taskReminders: true, mentions: true, statusUpdates: true },
          push: { enabled: false, taskReminders: false, mentions: false }
        }
      };
    }),
    catchError(error => {
      console.error('Error fetching current user:', error);
      return of(null);
    })
  );
}*/

  
  private getHeaders(): HttpHeaders {
    let token = localStorage.getItem('token');
    // If not found in localStorage, try to get it from authService
    if (!token && this.authService && typeof this.authService.getToken === 'function') {
      token = this.authService.getToken();
    }
  
    if (!token) {
      console.error('No authentication token found');
      return new HttpHeaders({
        'Content-Type': 'application/json'
      });
    }
  
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }
  
 

  private handleError(error: HttpErrorResponse) {
  console.error('API Error:', {
    status: error.status,
    statusText: error.statusText,
    error: error.error,
    url: error.url
  });
  
  let errorMessage = 'Something went wrong; please try again later.';
  if (error.status === 0) {
    errorMessage = 'Unable to connect to the server. Please check your internet connection.';
  } else if (error.status === 401) {
    errorMessage = 'Authentication required. Please log in again.';
  } else if (error.status === 403) {
    errorMessage = 'You do not have permission to access this resource.';
  } else if (error.status === 404) {
    errorMessage = 'The requested resource was not found.';
  } else if (error.error?.message) {
    errorMessage = error.error.message;
  }
  
  return throwError(() => new Error(errorMessage));
}

getUsers(): Observable<User[]> {
  return this.http.get<User[]>(`${this.apiUrl}`, { 
    headers: this.getHeaders() 
  }).pipe(
    catchError(this.handleError)
  );
}
getUsersByRole(role: string): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}?role=${role}`, { 
    headers: this.getHeaders() 
  }).pipe(
    catchError(this.handleError)
  );
}
// Add this method to your UserService
// getCurrentUser(): Observable<User> {
//   if (!this.userId) {
//     return throwError(() => new Error('No user ID found in localStorage'));
//   }
//   return this.http.get<User>(`${this.apiUrl}/${this.userId}`, { 
//     headers: this.getHeaders() 
//   }).pipe(
//     catchError(this.handleError)
//   );
// }

// In user.service.ts
updateUser(id: number, userData: Partial<User>): Observable<User> {
  // Create a clean object with only the fields we want to send
  const cleanUserData: any = {
    username: userData.username,
    email: userData.email,
    role: userData.role,
    department: userData.department,
    status: userData.status
  };

  // Remove any undefined or null values
  Object.keys(cleanUserData).forEach(key => 
    cleanUserData[key] === undefined && delete cleanUserData[key]
  );

  console.log('Sending clean update request:', cleanUserData);

  return this.http.put<User>(`${this.apiUrl}/${id}`, cleanUserData, {
    headers: this.getHeaders()
  }).pipe(
    catchError(error => {
      console.error('Error in updateUser:', error);
      return throwError(() => error);
    })
  );
}

  createUser(userData: any): Observable<any> {
    console.log('Creating user with data:', userData);
    const headers = this.getHeaders();
    console.log('Request headers:', headers); // Debug log
    
    return this.http.post<any>(this.apiUrl, userData, { 
      headers: headers 
    }).pipe(
      tap((response: any) => console.log('User created:', response)),
      catchError(error => {
        console.error('Error creating user:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          headers: error.headers
        });
        return throwError(() => new Error('Failed to create user. Please check your credentials and try again.'));
      })
    );
  }
  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }
}

//function tap(arg0: (response: any) => void): import("rxjs").OperatorFunction<any, any> {
//  throw new Error('Function not implemented.');
//}
