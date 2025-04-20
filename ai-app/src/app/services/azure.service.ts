import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, from } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AzureService {
  private apiUrl = 'http://localhost:9000/api'; // This will be proxied to the backend

  constructor(private http: HttpClient) { }

  // Upload file to Azure Blob Storage
  uploadFile(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post(`${this.apiUrl}/upload`, formData).pipe(
      tap(response => console.log('File uploaded:', response)),
      catchError(this.handleError('uploadFile', {}))
    );
  }

  // Get file processing history
  getFileHistory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/history`).pipe(
      tap(files => console.log('File history fetched:', files)),
      catchError(this.handleError<any[]>('getFileHistory', []))
    );
  }

  // Get entity extraction results for a specific file
  getEntityExtractionResults(fileId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/results/${fileId}`).pipe(
      tap(results => console.log('Entity extraction results:', results)),
      catchError(this.handleError('getEntityExtractionResults', {}))
    );
  }

  /**
   * Handle Http operation that failed.
   * Let the app continue.
   * @param operation - name of the operation that failed
   * @param result - optional value to return as the observable result
   */
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      
      // Let the app keep running by returning an empty result.
      return of(result as T);
    };
  }
}
