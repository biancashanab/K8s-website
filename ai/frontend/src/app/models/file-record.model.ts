export interface FileRecord {
  id: string;
  fileName: string;
  blobUrl: string;
  uploadTimestamp: Date;
  processingResult: string;
  entities?: Entity[];
}

export interface Entity {
  text: string;
  category: string;
  confidence: number;
}
