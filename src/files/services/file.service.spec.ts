import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileService } from './file.service';
import { File, FileType, StorageType } from '../entities/file.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';

// A minimal valid PNG buffer (1x1 transparent pixel)
const validPngBuffer = Buffer.from([
  0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A,0x00,0x00,0x00,0x0D,0x49,0x48,0x44,0x52,
  0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,0x08,0x06,0x00,0x00,0x00,0x1F,0x15,0xC4,
  0x89,0x00,0x00,0x00,0x0A,0x49,0x44,0x41,0x54,0x78,0x9C,0x63,0x00,0x01,0x00,0x00,
  0x05,0x00,0x01,0x0D,0x0A,0x2D,0xB4,0x00,0x00,0x00,0x00,0x49,0x45,0x4E,0x44,0xAE,
  0x42,0x60,0x82
]);

describe('FileService', () => {
  let service: FileService;
  let repository: Repository<File>;
  let configService: ConfigService;

  const mockFile = {
    originalname: 'test.png',
    mimetype: 'image/png',
    size: validPngBuffer.length,
    buffer: validPngBuffer,
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: { [key: string]: string } = {
        STORAGE_TYPE: 'local',
        UPLOAD_DIR: 'uploads',
        AWS_REGION: 'us-east-1',
        AWS_ACCESS_KEY_ID: 'test',
        AWS_SECRET_ACCESS_KEY: 'test',
        AWS_BUCKET_NAME: 'test-bucket',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    jest.restoreAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(File),
          useValue: {
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FileService>(FileService);
    repository = module.get<Repository<File>>(getRepositoryToken(File));
    configService = module.get<ConfigService>(ConfigService);

    // Mock the scanFile method to always return true (file is clean)
    jest.spyOn(service as any, 'scanFile').mockResolvedValue(true);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should throw BadRequestException for invalid file type', async () => {
      const invalidFile = { ...mockFile, mimetype: 'application/invalid' };
      await expect(
        service.uploadFile(invalidFile as any, { type: FileType.IMAGE }, 'user-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for file exceeding size limit', async () => {
      const largeFile = { ...mockFile, size: 11 * 1024 * 1024 };
      await expect(
        service.uploadFile(largeFile as any, { type: FileType.IMAGE }, 'user-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully upload a valid file', async () => {
      const mockSavedFile = new File();
      jest.spyOn(repository, 'save').mockResolvedValue(mockSavedFile);
      jest.spyOn(fs.promises, 'writeFile').mockResolvedValue();

      const result = await service.uploadFile(
        mockFile as any,
        { type: FileType.IMAGE },
        'user-id',
      );

      expect(result).toBe(mockSavedFile);
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('getFile', () => {
    it('should throw NotFoundException when file is not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.getFile('non-existent-id', 'user-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return file data when file exists', async () => {
      const mockFileEntity = new File();
      mockFileEntity.filename = 'test.png';
      mockFileEntity.storageType = StorageType.LOCAL;
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockFileEntity);
      jest.spyOn(fs.promises, 'readFile').mockResolvedValue(validPngBuffer);

      const result = await service.getFile('file-id', 'user-id');
      expect(result).toBeDefined();
      expect(result.buffer).toEqual(validPngBuffer);
    });
  });

  describe('deleteFile', () => {
    it('should throw NotFoundException when file is not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.deleteFile('non-existent-id', 'user-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should mark file as deleted', async () => {
      const mockFile = new File();
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockFile);
      jest.spyOn(repository, 'save').mockResolvedValue(mockFile);

      await service.deleteFile('file-id', 'user-id');
      expect(mockFile.isDeleted).toBe(true);
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('getFilesByUser', () => {
    it('should return array of files for user', async () => {
      const mockFiles = [new File(), new File()];
      jest.spyOn(repository, 'find').mockResolvedValue(mockFiles);

      const result = await service.getFilesByUser('user-id');
      expect(result).toEqual(mockFiles);
      expect(repository.find).toHaveBeenCalledWith({
        where: { userId: 'user-id', isDeleted: false },
      });
    });
  });

  describe('getFilesByMessage', () => {
    it('should return array of files for message', async () => {
      const mockFiles = [new File(), new File()];
      jest.spyOn(repository, 'find').mockResolvedValue(mockFiles);

      const result = await service.getFilesByMessage('message-id');
      expect(result).toEqual(mockFiles);
      expect(repository.find).toHaveBeenCalledWith({
        where: { messageId: 'message-id', isDeleted: false },
      });
    });
  });
}); 