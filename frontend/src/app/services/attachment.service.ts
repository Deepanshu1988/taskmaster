import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpHeaders, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environments';
import { map } from 'rxjs/operators';

export interface TaskAttachment {
  id: number;
  task_id: number;
  user_id: number;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  created_at: string;
  updated_at: string;
  uploaded_by?: string;
  size: number;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class AttachmentService {
  private apiUrl = `${environment.apiUrl}/task-attachments`;

  constructor(private http: HttpClient) {}

  // Upload a file for a task
  uploadFile(taskId: number, formData: FormData): Observable<HttpEvent<any>> {
    const url = `${this.apiUrl}/tasks/${taskId}/attachments`;
    const req = new HttpRequest('POST', url, formData, {
      reportProgress: true,
      responseType: 'json'
    });
    return this.http.request(req);
  }

  // Get all attachments for a task
  getTaskAttachments(taskId: number): Observable<TaskAttachment[]> {
    return this.http.get<TaskAttachment[]>(
      `${this.apiUrl}/tasks/${taskId}/attachments`,
      { headers: this.getHeaders() }
    );
  }
  private getHeaders(): HttpHeaders {
    // If you're using authentication, get the token
    const token = localStorage.getItem('auth_token'); // or your token storage key
    
    // Return headers with or without authorization
    if (token) {
      return new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      });
    } else {
      return new HttpHeaders({
        'Content-Type': 'application/json'
      });
    }
  }
  // Download a file
  downloadFile(attachmentId: number): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/download/${attachmentId}`,
      { responseType: 'blob' }
    );
  }

  // Delete a file
  deleteFile(attachmentId: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/${attachmentId}`
    );
  }

  // Alias for deleteFile for backward compatibility
  deleteAttachment(attachmentId: number): Observable<{ success: boolean; message: string }> {
    return this.deleteFile(attachmentId);
  }

  // Format file size to human readable format
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Get file icon based on file type
  getFileIcon(fileType: string): string {
    if (!fileType) return 'fa-file';
    
    if (fileType.includes('image/')) {
      return 'fa-file-image';
    } else if (fileType.includes('pdf')) {
      return 'fa-file-pdf';
    } else if (
      fileType.includes('word') || 
      fileType.includes('document') ||
      fileType === 'application/msword' ||
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return 'fa-file-word';
    } else if (
      fileType.includes('excel') ||
      fileType === 'application/vnd.ms-excel' ||
      fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      return 'fa-file-excel';
    } else if (fileType.includes('text/')) {
      return 'fa-file-alt';
    } else {
      return 'fa-file';
    }
  }
}
