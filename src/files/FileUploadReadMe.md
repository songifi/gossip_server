
## File Upload System

The file upload system provides secure and efficient handling of file uploads with support for both local storage and AWS S3.

### Features

- File upload with type and size validation
- Support for images, documents, and audio files
- Image resizing and optimization
- File encryption for sensitive content
- AWS S3 integration
- CDN support
- Automatic file cleanup

### File Type Restrictions

- Images: .jpg, .jpeg, .png, .gif, .webp (max 10MB)
- Documents: .pdf, .doc, .docx, .xls, .xlsx (max 50MB)
- Audio: .mp3, .wav, .m4a (max 50MB)

### Environment Variables

Create a `.env` file with the following variables:

```env
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=gossip_server

# File Storage Configuration
STORAGE_TYPE=local # or 's3'
UPLOAD_DIR=uploads

# AWS S3 Configuration (if using S3)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_BUCKET_NAME=your_bucket_name

# Security
JWT_SECRET=your_jwt_secret
FILE_ENCRYPTION_KEY=your_encryption_key

# CDN Configuration (if using CloudFront)
CDN_DOMAIN=your_cdn_domain
CDN_KEY_PAIR_ID=your_key_pair_id
CDN_PRIVATE_KEY=your_private_key
```

### API Endpoints

#### Upload File
```http
POST /files/upload
Content-Type: multipart/form-data

file: <file>
type: "image" | "document" | "audio"
messageId?: string
encryptionKey?: string
```

#### Get File
```http
GET /files/:id
```

#### Delete File
```http
DELETE /files/:id
```

#### Get User Files
```http
GET /files/user/:userId
```

#### Get Message Files
```http
GET /files/message/:messageId
```

### Security Features

- File type validation
- Size restrictions
- AES-256 encryption for sensitive files
- Signed URLs for private files
- Automatic file cleanup after 7 days
- Path traversal protection
- Virus scanning integration

### Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start the server:
```bash
npm run start:dev
```

### Testing

Run the test suite:
```bash
npm test
```