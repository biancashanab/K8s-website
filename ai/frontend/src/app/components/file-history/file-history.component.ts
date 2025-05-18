import { Component, OnInit } from '@angular/core';
import { AzureService } from '../../services/azure.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-file-history',
  templateUrl: './file-history.component.html',
  styleUrls: ['./file-history.component.css']
})
export class FileHistoryComponent implements OnInit {
  files: any[] = [];
  selectedFile: any = null;
  entityResults: any = null;
  loading = false;
  error: string | null = null;
  apiHealthStatus: boolean | null = null;
  environment = environment;
  apiUrl = environment.apiUrl;

  constructor(private azureService: AzureService) { }

  ngOnInit(): void {
    this.loadFileHistory();
    this.checkApiHealth();
  }

  checkApiHealth(): void {
    this.azureService.checkApiHealth().subscribe(
      isHealthy => {
        this.apiHealthStatus = isHealthy;
        if (!isHealthy && !this.error) {
          this.error = 'API connectivity issue detected. The backend service may be unavailable.';
        }
      }
    );
  }

  loadFileHistory(): void {
    this.loading = true;
    this.error = null;
    
    this.azureService.getFileHistory().subscribe(
      (data) => {
        console.log('Raw file history data:', data);
        // Transform the data to match expected format
        this.files = this.transformFileData(data);
        console.log('Transformed file history:', this.files);
        this.loading = false;
      },
      (error) => {
        console.error('File history error:', error);
        this.error = 'Failed to load file history. ' + (error.message || 'Unknown error');
        this.loading = false;
      }
    );
  }

  /**
   * Transform backend data format to the format expected by the component
   */
  private transformFileData(data: any[]): any[] {
    if (!data || !Array.isArray(data)) {
      console.warn('Invalid data format received:', data);
      return [];
    }

    return data.map(item => {
      // Support both camelCase and snake_case property names from API
      return {
        id: item.id,
        fileName: item.fileName || item.file_name,
        fileType: this.getFileType(item.fileName || item.file_name),
        blobUrl: item.blobUrl || item.blob_url,
        uploadTimestamp: item.uploadTimestamp || new Date(item.upload_timestamp),
        processingStatus: item.processingStatus || item.processing_status || 'Unknown'
      };
    });
  }

  /**
   * Extract file type from filename
   */
  private getFileType(fileName: string): string {
    if (!fileName) return 'Unknown';
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension || 'Unknown';
  }

  viewEntityResults(file: any): void {
    this.selectedFile = file;
    this.loading = true;
    this.error = null;
    
    this.azureService.getEntityExtractionResults(file.id).subscribe(
      (data) => {
        console.log('Entity results data:', data);
        this.entityResults = this.transformEntityResults(data);
        this.loading = false;
      },
      (error) => {
        console.error('Entity results error:', error);
        this.error = 'Failed to load entity extraction results. ' + (error.message || 'Unknown error');
        this.loading = false;
      }
    );
  }

  /**
   * Transform entity extraction results to expected format
   */
  private transformEntityResults(data: any): any {
    if (!data) return null;
    
    // Ensure entities array is properly formatted
    let entities = [];
    if (data.entities && Array.isArray(data.entities)) {
      entities = data.entities.map((entity: any) => ({
        text: entity.text,
        category: entity.category,
        confidenceScore: entity.confidenceScore || entity.confidence_score || 0
      }));
    }

    return {
      ...data,
      entities
    };
  }

  clearSelection(): void {
    this.selectedFile = null;
    this.entityResults = null;
  }
}
