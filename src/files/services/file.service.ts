import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as sharp from 'sharp';
import * as crypto from 'crypto-js';
import * as fs from 'fs';
import * as path from 'path';
import { File, FileType, StorageType } from '../entities/file.entity';
import { UploadFileDto } from '../dto/upload-file.dto';
import { getSignedUrl as getCloudFrontSignedUrl } from '@aws-sdk/cloudfront-signer';
const NodeClam = require('clamscan');

@Injectable()
export class FileService {
  private s3Client: S3Client;
  private readonly uploadDir: string;
  private readonly allowedMimeTypes = {
    [FileType.IMAGE]: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    [FileType.DOCUMENT]: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    [FileType.AUDIO]: ['audio/mpeg', 'audio/wav', 'audio/x-m4a'],
  };

  private readonly maxFileSizes = {
    [FileType.IMAGE]: 10 * 1024 * 1024, // 10MB
    [FileType.DOCUMENT]: 50 * 1024 * 1024, // 50MB
    [FileType.AUDIO]: 50 * 1024 * 1024, // 50MB
  };

  constructor(
    @InjectRepository(File)
    private fileRepository: Repository<File>,
    private configService: ConfigService,
  ) {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    if (this.configService.get('STORAGE_TYPE') === StorageType.S3) {
      const region = this.configService.get('AWS_REGION');
      const accessKeyId = this.configService.get('AWS_ACCESS_KEY_ID');
      const secretAccessKey = this.configService.get('AWS_SECRET_ACCESS_KEY');

      if (!region || !accessKeyId || !secretAccessKey) {
        throw new Error('AWS credentials are not properly configured');
      }

      this.s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    }
  }

  private async scanFile(buffer: Buffer): Promise<boolean> {
    const clamscan = await new NodeClam().init({
      removeInfected: false,
      quarantineInfected: false,
      scanLog: null,
      debugMode: false,
      fileList: null,
      scanRecursively: false,
      clamscan: {
        path: this.configService.get('CLAMSCAN_PATH') || '/usr/bin/clamscan',
        db: null,
        scanArchives: true,
        active: true,
      },
      preference: 'clamscan',
    });
    const { isInfected } = await clamscan.scanBuffer(buffer);
    return !isInfected;
  }

  private getCdnUrl(filename: string): string {
    const cdnDomain = this.configService.get('CDN_DOMAIN');
    if (!cdnDomain) return '';
    return `https://${cdnDomain}/${filename}`;
  }

  private getCloudFrontSignedUrl(filename: string): string {
    const cdnDomain = this.configService.get('CDN_DOMAIN');
    const keyPairId = this.configService.get('CDN_KEY_PAIR_ID');
    const privateKey = this.configService.get('CDN_PRIVATE_KEY');
    if (!cdnDomain || !keyPairId || !privateKey) return this.getCdnUrl(filename);
    return getCloudFrontSignedUrl({
      url: `https://${cdnDomain}/${filename}`,
      keyPairId,
      privateKey,
      dateLessThan: Math.floor(Date.now() / 1000) + 3600,
    });
  }

  async uploadFile(file: Express.Multer.File, dto: UploadFileDto, userId: string): Promise<File> {
    // Validate file type and size
    this.validateFile(file, dto.type);

    // Virus scan
    const isClean = await this.scanFile(file.buffer);
    if (!isClean) {
      throw new BadRequestException('File contains malicious content');
    }

    // Generate unique filename
    const filename = `${Date.now()}-${file.originalname}`;
    const fileEntity = new File();
    fileEntity.filename = filename;
    fileEntity.originalName = file.originalname;
    fileEntity.mimeType = file.mimetype;
    fileEntity.size = file.size;
    fileEntity.type = dto.type;
    fileEntity.userId = userId;
    fileEntity.messageId = dto.messageId;

    if (dto.encryptionKey) {
      fileEntity.isEncrypted = true;
      fileEntity.encryptionKey = dto.encryptionKey;
      file.buffer = this.encryptFile(file.buffer, dto.encryptionKey);
    }

    if (this.configService.get('STORAGE_TYPE') === StorageType.S3) {
      await this.uploadToS3(file.buffer, filename, file.mimetype);
      fileEntity.storageType = StorageType.S3;
      // CDN integration
      if (this.configService.get('CDN_DOMAIN')) {
        fileEntity.url = this.getCloudFrontSignedUrl(filename);
      } else {
        fileEntity.url = `https://${this.configService.get('AWS_BUCKET_NAME')}.s3.amazonaws.com/${filename}`;
      }
    } else {
      await this.uploadToLocal(file.buffer, filename);
      fileEntity.storageType = StorageType.LOCAL;
      fileEntity.url = `/uploads/${filename}`;
    }

    // Process image if it's an image file
    if (dto.type === FileType.IMAGE) {
      await this.processImage(file.buffer, filename, fileEntity);
    }

    return this.fileRepository.save(fileEntity);
  }

  private async processImage(buffer: Buffer, filename: string, fileEntity: File): Promise<void> {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Create thumbnail
    const thumbnailBuffer = await image
      .resize(200, 200, { fit: 'inside' })
      .toBuffer();

    // Create medium size
    const mediumBuffer = await image
      .resize(800, 800, { fit: 'inside' })
      .toBuffer();

    const thumbnailFilename = `thumb-${filename}`;
    const mediumFilename = `medium-${filename}`;

    if (this.configService.get('STORAGE_TYPE') === StorageType.S3) {
      await this.uploadToS3(thumbnailBuffer, thumbnailFilename, fileEntity.mimeType);
      await this.uploadToS3(mediumBuffer, mediumFilename, fileEntity.mimeType);
      if (this.configService.get('CDN_DOMAIN')) {
        fileEntity.thumbnailUrl = this.getCloudFrontSignedUrl(thumbnailFilename);
        fileEntity.mediumUrl = this.getCloudFrontSignedUrl(mediumFilename);
      } else {
        fileEntity.thumbnailUrl = `https://${this.configService.get('AWS_BUCKET_NAME')}.s3.amazonaws.com/${thumbnailFilename}`;
        fileEntity.mediumUrl = `https://${this.configService.get('AWS_BUCKET_NAME')}.s3.amazonaws.com/${mediumFilename}`;
      }
    } else {
      await this.uploadToLocal(thumbnailBuffer, thumbnailFilename);
      await this.uploadToLocal(mediumBuffer, mediumFilename);
      fileEntity.thumbnailUrl = `/uploads/${thumbnailFilename}`;
      fileEntity.mediumUrl = `/uploads/${mediumFilename}`;
    }
  }

  private validateFile(file: Express.Multer.File, type: FileType): void {
    if (!this.allowedMimeTypes[type].includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed for ${type}`);
    }

    if (file.size > this.maxFileSizes[type]) {
      throw new BadRequestException(`File size exceeds maximum allowed size for ${type}`);
    }
  }

  private async uploadToS3(buffer: Buffer, filename: string, mimeType: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.configService.get('AWS_BUCKET_NAME'),
      Key: filename,
      Body: buffer,
      ContentType: mimeType,
    });

    await this.s3Client.send(command);
  }

  private async uploadToLocal(buffer: Buffer, filename: string): Promise<void> {
    const filePath = path.join(this.uploadDir, filename);
    await fs.promises.writeFile(filePath, buffer);
  }

  private encryptFile(buffer: Buffer, key: string): Buffer {
    const encrypted = crypto.AES.encrypt(buffer.toString('base64'), key);
    return Buffer.from(encrypted.toString());
  }

  private decryptFile(buffer: Buffer, key: string): Buffer {
    const decrypted = crypto.AES.decrypt(buffer.toString(), key);
    return Buffer.from(decrypted.toString(crypto.enc.Utf8), 'base64');
  }

  async getFile(id: string, userId: string): Promise<{ url: string; buffer?: Buffer }> {
    const file = await this.fileRepository.findOne({ where: { id, userId } });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.storageType === StorageType.S3) {
      // CDN integration
      if (this.configService.get('CDN_DOMAIN')) {
        return { url: this.getCloudFrontSignedUrl(file.filename) };
      }
      const command = new GetObjectCommand({
        Bucket: this.configService.get('AWS_BUCKET_NAME'),
        Key: file.filename,
      });
      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
      return { url: signedUrl };
    } else {
      const filePath = path.join(this.uploadDir, file.filename);
      const buffer = await fs.promises.readFile(filePath);

      if (file.isEncrypted && file.encryptionKey) {
        const decryptedBuffer = this.decryptFile(buffer, file.encryptionKey);
        return { url: file.url, buffer: decryptedBuffer };
      }

      return { url: file.url, buffer };
    }
  }

  async deleteFile(id: string, userId: string): Promise<void> {
    const file = await this.fileRepository.findOne({ where: { id, userId } });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    file.isDeleted = true;
    await this.fileRepository.save(file);

    // Schedule physical deletion after retention period
    setTimeout(async () => {
      if (file.storageType === StorageType.S3) {
        const command = new DeleteObjectCommand({
          Bucket: this.configService.get('AWS_BUCKET_NAME'),
          Key: file.filename,
        });
        await this.s3Client.send(command);
      } else {
        const filePath = path.join(this.uploadDir, file.filename);
        await fs.promises.unlink(filePath);
      }
      await this.fileRepository.remove(file);
    }, 7 * 24 * 60 * 60 * 1000); // 7 days
  }

  async getFilesByUser(userId: string): Promise<File[]> {
    return this.fileRepository.find({ where: { userId, isDeleted: false } });
  }

  async getFilesByMessage(messageId: string): Promise<File[]> {
    return this.fileRepository.find({ where: { messageId, isDeleted: false } });
  }
} 