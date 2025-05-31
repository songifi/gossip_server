import { PartialType } from '@nestjs/mapped-types';
import { RegisterDeviceDto } from './create-sync.dto';

export class UpdateSyncDto extends PartialType(RegisterDeviceDto) {}
