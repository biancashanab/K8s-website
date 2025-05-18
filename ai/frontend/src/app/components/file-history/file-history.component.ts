import { Component, OnInit } from '@angular/core';
import { AzureService } from '../../services/azure.service';

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

  constructor(private azureService: AzureService) { }

  ngOnInit(): void {
    this.loadFileHistory();
  }

  loadFileHistory(): void {
    this.loading = true;
    this.error = null;
    
    this.azureService.getFileHistory().subscribe(
      (data) => {
        this.files = data;
        this.loading = false;
      },
      (error) => {
        this.error = 'Failed to load file history. ' + (error.message || 'Unknown error');
        this.loading = false;
      }
    );
  }

  viewEntityResults(file: any): void {
    this.selectedFile = file;
    this.loading = true;
    this.error = null;
    
    this.azureService.getEntityExtractionResults(file.id).subscribe(
      (data) => {
        this.entityResults = data;
        this.loading = false;
      },
      (error) => {
        this.error = 'Failed to load entity extraction results. ' + (error.message || 'Unknown error');
        this.loading = false;
      }
    );
  }

  clearSelection(): void {
    this.selectedFile = null;
    this.entityResults = null;
  }
}
