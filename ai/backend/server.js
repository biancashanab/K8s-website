const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { BlobServiceClient } = require('@azure/storage-blob');
const { TextAnalyticsClient, AzureKeyCredential } = require('@azure/ai-text-analytics');
const sql = require('mssql');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const textract = require('textract');
const bodyParser = require('body-parser');
const winston = require('winston');
require('dotenv').config();

// Setup logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'ai-backend' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Initialize Express app
const app = express();
const port = process.env.PORT || 89;

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Define allowed MIME types
    const allowedMimeTypes = [
      'application/pdf', // PDF
      'application/msword', // DOC
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'text/plain', // TXT
      'application/rtf' // RTF
    ];
    // Define allowed extensions
    const filetypes = /pdf|doc|docx|txt|rtf/;
    const mimetype = allowedMimeTypes.includes(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only PDF, DOC, DOCX, TXT, or RTF files are allowed!'));
  }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Server error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Azure Configuration
const getAzureConfig = () => {
  const azureConfig = {
    storageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
    sqlConnectionString: process.env.AZURE_SQL_CONNECTION_STRING,
    languageKey: process.env.AZURE_LANGUAGE_KEY,
    languageEndpoint: process.env.AZURE_LANGUAGE_ENDPOINT,
    containerName: 'ai-uploads'
  };

  const missingKeys = Object.entries(azureConfig)
    .filter(([key, value]) => !value && key !== 'containerName')
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    const errorMsg = `Missing Azure configuration: ${missingKeys.join(', ')}`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  return azureConfig;
};

// Initialize Azure clients
let blobServiceClient;
let containerClient;
let languageClient;
let azureConfig;

const initializeAzureClients = async () => {
  try {
    azureConfig = getAzureConfig();

    // Initialize Blob Storage client
    blobServiceClient = BlobServiceClient.fromConnectionString(azureConfig.storageConnectionString);
    containerClient = blobServiceClient.getContainerClient(azureConfig.containerName);
    await containerClient.createIfNotExists();
    logger.info('Blob Storage container initialized');

    // Initialize Text Analytics client
    languageClient = new TextAnalyticsClient(
      azureConfig.languageEndpoint,
      new AzureKeyCredential(azureConfig.languageKey)
    );
    logger.info('Text Analytics client initialized');

  } catch (error) {
    logger.error('Failed to initialize Azure clients', { error: error.message });
    throw error;
  }
};

// Create uploads directory
const ensureUploadsDir = async () => {
  try {
    await fs.mkdir('uploads', { recursive: true });
    logger.info('Uploads directory created or already exists');
  } catch (error) {
    logger.error('Failed to create uploads directory', { error: error.message });
    throw error;
  }
};

// Initialize SQL Database
const initializeDatabase = async () => {
  let pool;
  try {
    logger.info('Initializing SQL Database...');
    pool = await sql.connect(azureConfig.sqlConnectionString);
    logger.info('SQL connection established');

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'file_processing')
      BEGIN
        CREATE TABLE file_processing (
          id UNIQUEIDENTIFIER PRIMARY KEY,
          file_name NVARCHAR(255) NOT NULL,
          blob_url NVARCHAR(1024) NOT NULL,
          upload_timestamp DATETIME NOT NULL,
          processing_status NVARCHAR(50) NOT NULL,
          processing_result NVARCHAR(MAX)
        )
      END
    `);
    logger.info('SQL Database table created or already exists');
  } catch (error) {
    logger.error('SQL Database initialization error', {
      error: error.message,
      connectionString: azureConfig.sqlConnectionString ? '[SET]' : '[NOT SET]'
    });
    throw error;
  } finally {
    if (pool) await pool.close();
  }
};

// Extract text from file
const extractTextFromFile = (filePath) => {
  return new Promise((resolve, reject) => {
    textract.fromFileWithPath(filePath, { preserveLineBreaks: true }, (error, text) => {
      if (error) {
        logger.error('Text extraction failed', { error: error.message, filePath });
        return reject(error);
      }
      resolve(text);
    });
  });
};

// Process text with Azure Text Analytics
const processTextWithEntityExtraction = async (text) => {
  try {
    const trimmedText = text.length > 5000 ? text.substring(0, 5000) : text;
    const documents = [trimmedText];
    const results = await languageClient.recognizeEntities(documents);

    if (!results || !results[0] || results[0].error || !results[0].entities) {
      logger.warn('Entity extraction returned no entities or errored', { results });
      return [];
    }

    return results[0].entities.map(entity => ({
      text: entity.text,
      category: entity.category,
      confidenceScore: entity.confidenceScore
    }));
  } catch (error) {
    logger.error('Entity extraction error', { error: error.message });
    throw error;
  }
};

// Routes
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      blob: blobServiceClient ? 'initialized' : 'not initialized',
      language: languageClient ? 'initialized' : 'not initialized',
      sql: 'not checked'
    }
  });
});

app.get('/api/test-azure', async (req, res) => {
  const testResults = {
    blobStorage: 'not tested',
    sqlDatabase: 'not tested',
    languageService: 'not tested'
  };

  try {
    // Test Blob Storage
    try {
      await containerClient.getProperties();
      testResults.blobStorage = 'success';
      logger.info('Blob Storage test passed');
    } catch (error) {
      testResults.blobStorage = `failed: ${error.message}`;
      logger.error('Blob Storage test failed', { error: error.message });
    }

    // Test SQL Database
    let pool;
    try {
      pool = await sql.connect(azureConfig.sqlConnectionString);
      await pool.request().query('SELECT TOP 1 * FROM INFORMATION_SCHEMA.TABLES');
      testResults.sqlDatabase = 'success';
      logger.info('SQL Database test passed');
    } catch (error) {
      testResults.sqlDatabase = `failed: ${error.message}`;
      logger.error('SQL Database test failed', { error: error.message });
    } finally {
      if (pool) await pool.close();
    }

    // Test Language Service
    try {
      const testText = 'Microsoft was founded by Bill Gates in Seattle.';
      const results = await languageClient.recognizeEntities([testText]);
      testResults.languageService = results[0].entities.length > 0 ? 'success' : 'failed: no entities found';
      logger.info('Language Service test passed');
    } catch (error) {
      testResults.languageService = `failed: ${error.message}`;
      logger.error('Language Service test failed', { error: error.message });
    }

    res.status(200).json(testResults);
  } catch (error) {
    logger.error('Azure services test failed', { error: error.message });
    res.status(500).json({ error: 'Failed to test Azure services', message: error.message });
  }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileId = uuidv4();
    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const fileExtension = path.extname(fileName);
    const blobName = `${fileId}${fileExtension}`;

    logger.info('File received', { fileName, fileId });

    // Upload to Blob Storage
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const data = await fs.readFile(filePath);
    await blockBlobClient.upload(data, data.length);
    const blobUrl = blockBlobClient.url;
    logger.info('File uploaded to Blob Storage', { blobUrl });

    // Save to SQL
    let pool;
    try {
      pool = await sql.connect(azureConfig.sqlConnectionString);
      await pool.request()
        .input('id', sql.UniqueIdentifier, fileId)
        .input('file_name', sql.NVarChar, fileName)
        .input('blob_url', sql.NVarChar, blobUrl)
        .input('upload_timestamp', sql.DateTime, new Date())
        .input('processing_status', sql.NVarChar, 'Processing')
        .query(`
          INSERT INTO file_processing 
          (id, file_name, blob_url, upload_timestamp, processing_status)
          VALUES (@id, @file_name, @blob_url, @upload_timestamp, @processing_status)
        `);
      logger.info('Initial record created in SQL', { fileId });
    } catch (error) {
      logger.error('SQL insert error', { error: error.message, fileId });
      throw error;
    }

    // Process file
    let entities = [];
    let processingStatus = 'Processing';

    try {
      const text = await extractTextFromFile(filePath);
      logger.info('Text extracted', { fileId, textLength: text.length });

      entities = await processTextWithEntityExtraction(text);
      processingStatus = 'Completed';
      logger.info('Entity extraction completed', { fileId, entitiesCount: entities.length });
    } catch (error) {
      logger.error('Processing error', { error: error.message, fileId });
      processingStatus = 'Failed';
    }

    // Update SQL record
    try {
      if (!pool || pool._connected === false) {
        pool = await sql.connect(azureConfig.sqlConnectionString);
      }
      await pool.request()
        .input('id', sql.UniqueIdentifier, fileId)
        .input('processing_status', sql.NVarChar, processingStatus)
        .input('processing_result', sql.NVarChar, JSON.stringify({ entities }))
        .query(`
          UPDATE file_processing
          SET processing_status = @processing_status,
              processing_result = @processing_result
          WHERE id = @id
        `);
      logger.info('SQL record updated', { fileId });
    } catch (error) {
      logger.error('SQL update error', { error: error.message, fileId });
      throw error;
    } finally {
      if (pool) await pool.close();
    }

    // Clean up
    try {
      await fs.unlink(filePath);
      logger.info('Temporary file deleted', { filePath });
    } catch (error) {
      logger.error('Failed to delete temporary file', { error: error.message, filePath });
    }

    res.status(200).json({
      id: fileId,
      fileName,
      blobUrl,
      uploadTimestamp: new Date().toISOString(),
      processingStatus,
      entities: processingStatus === 'Completed' ? entities : []
    });
  } catch (error) {
    logger.error('Upload error', { error: error.message });
    res.status(500).json({ error: 'File upload and processing failed', message: error.message });
  }
});

app.get('/api/history', async (req, res) => {
  let pool;
  try {
    pool = await sql.connect(azureConfig.sqlConnectionString);
    const result = await pool.request().query(`
      SELECT id, file_name, blob_url, upload_timestamp, processing_status
      FROM file_processing
      ORDER BY upload_timestamp DESC
    `);
    logger.info('History retrieved', { recordCount: result.recordset.length });
    res.status(200).json(result.recordset);
  } catch (error) {
    logger.error('History fetch error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch file history', message: error.message });
  } finally {
    if (pool) await pool.close();
  }
});

app.get('/api/results/:id', async (req, res) => {
  const fileId = req.params.id;
  let pool;
  try {
    pool = await sql.connect(azureConfig.sqlConnectionString);
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, fileId)
      .query(`
        SELECT id, file_name, blob_url, upload_timestamp, processing_status, processing_result
        FROM file_processing
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      logger.warn('File not found', { fileId });
      return res.status(404).json({ error: 'File not found' });
    }

    const file = result.recordset[0];
    let processingResult = {};
    if (file.processing_result) {
      try {
        processingResult = JSON.parse(file.processing_result);
      } catch (error) {
        logger.error('Error parsing processing result', { error: error.message, fileId });
      }
    }

    res.status(200).json({
      id: file.id,
      fileName: file.file_name,
      blobUrl: file.blob_url,
      uploadTimestamp: file.upload_timestamp,
      processingStatus: file.processing_status,
      ...processingResult
    });
  } catch (error) {
    logger.error('Results fetch error', { error: error.message, fileId });
    res.status(500).json({ error: 'Failed to fetch processing results', message: error.message });
  } finally {
    if (pool) await pool.close();
  }
});

// Initialize and start server
const startServer = async () => {
  try {
    await ensureUploadsDir();
    await initializeAzureClients();
    await initializeDatabase();

    app.listen(port, () => {
      logger.info(`AI Backend server running on port ${port}`);
    });
  } catch (error) {
    logger.error('Server initialization failed', { error: error.message });
    process.exit(1);
  }
};

// Handle process errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', { reason });
  process.exit(1);
});

startServer();
