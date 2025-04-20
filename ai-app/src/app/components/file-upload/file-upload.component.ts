import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AzureService } from '../../services/azure.service';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.css']
})
export class FileUploadComponent implements OnInit {
  uploadForm: FormGroup;
  selectedFile: File | null = null;
  isUploading = false;
  uploadResult: any = null;
  uploadError: string | null = null;

  constructor(
    private fb: FormBuilder,
    private azureService: AzureService
  ) {
    this.uploadForm = this.fb.group({
      file: [null, Validators.required]
    });
  }

  ngOnInit(): void {
  }

  onFileSelected(event: Event): void {
    const element = event.target as HTMLInputElement;
    if (element.files && element.files.length > 0) {
      this.selectedFile = element.files[0];
      this.uploadForm.patchValue({ file: this.selectedFile });
    }
  }

  onSubmit(): void {
    if (this.uploadForm.invalid || !this.selectedFile) {
      return;
    }

    this.isUploading = true;
    this.uploadError = null;
    this.uploadResult = null;

    this.azureService.uploadFile(this.selectedFile)
      .subscribe(
        result => {
          this.uploadResult = result;
          this.isUploading = false;
          this.resetForm();
        },
        error => {
          this.uploadError = 'Error uploading file: ' + (error.message || 'Unknown error');
          this.isUploading = false;
        }
      );
  }

  resetForm(): void {
    this.uploadForm.reset();
    this.selectedFile = null;
  }
}
