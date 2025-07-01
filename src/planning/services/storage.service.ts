import { Injectable } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService {
  private s3: AWS.S3;

  constructor(private configService: ConfigService) {
    this.s3 = new AWS.S3({
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get('AWS_REGION'),
    });
  }

  async uploadFile(file: Express.Multer.File, path: string): Promise<string> {
    const key = `${path}/${Date.now()}-${file.originalname}`;
    
    const uploadResult = await this.s3
      .upload({
        Bucket: this.configService.get('AWS_S3_BUCKET'),
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      })
      .promise();

    return uploadResult.Location;
  }
}