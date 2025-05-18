import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AzureService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {
    console.log('Azure Service initialized with API URL:', this.apiUrl);
  }

  /**
   * Upload file to Azure for entity extraction processing
   */
  uploadFile(file: File): Observable<any> {
    console.log('Uploading file:', file.name, 'size:', file.size, 'type:', file.type);
    
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post(`${this.apiUrl}/upload`, formData).pipe(
      tap(response => console.log('File upload successful:', response)),
      catchError(this.handleHttpError('uploadFile'))
    );
  }

  /**
   * Get file processing history
   */
  getFileHistory(): Observable<any[]> {
    console.log('Fetching file history from:', `${this.apiUrl}/history`);
    
    return this.http.get<any[]>(`${this.apiUrl}/history`).pipe(
      tap(response => console.log('File history response received, count:', Array.isArray(response) ? response.length : 'not an array')),
      map(response => {
        // If response is not an array, convert to empty array
        if (!Array.isArray(response)) {
          console.warn('Expected array response from history endpoint, got:', typeof response);
          return [];
        }
        return response;
      }),
      catchError(this.handleHttpError('getFileHistory', []))
    );
  }

  /**
   * Get entity extraction results for a specific file
   */
  getEntityExtractionResults(fileId: string): Observable<any> {
    console.log('Fetching entity results for file:', fileId);
    
    return this.http.get<any>(`${this.apiUrl}/results/${fileId}`).pipe(
      tap(response => console.log('Entity extraction results received:', response)),
      catchError(this.handleHttpError('getEntityExtractionResults'))
    );
  }

  /**
   * Health check to verify API connectivity
   */
  checkApiHealth(): Observable<boolean> {
    return this.http.get<any>(`${this.apiUrl}/health`).pipe(
      map(response => true),
      catchError(error => {
        console.error('API health check failed:', error);
        return of(false);
      })
    );
  }

  /**
   * Enhanced error handler with detailed logging and contextual recovery
   */
  private handleHttpError<T>(operation = 'operation', fallbackValue?: T) {
    return (error: HttpErrorResponse): Observable<T> => {
      const errorDetails = {
        operation,
        status: error.status,
        statusText: error.statusText,
        message: error.message,
        url: error.url || `${this.apiUrl}/${operation}`
      };
      
      console.error(`${operation} failed:`, errorDetails);
      
      // For 404 errors, provide specific feedback
      if (error.status === 404) {
        return throwError(() => new Error(`The requested resource was not found. Please verify the service is running.`));
      }
      
      // For network errors, provide connectivity guidance
      if (error.status === 0) {
        return throwError(() => new Error(`Network error - Please check your connection and ensure the backend service is running.`));
      }
      
      // For server errors, provide appropriate feedback
      if (error.status >= 500) {
        return throwError(() => new Error(`Server error (${error.status}) - The backend service encountered a problem.`));
      }
      
      // If a fallback value was provided, return it instead of throwing
      if (fallbackValue !== undefined) {
        return of(fallbackValue as T);
      }
      
      // Otherwise, propagate the error
      return throwError(() => new Error(`${operation} failed: ${error.message}`));
    };
  }
}
