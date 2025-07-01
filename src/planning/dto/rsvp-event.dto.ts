import { IsEnum, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { RsvpStatus } from '../entities/event-rsvp.entity';

export class RsvpEventDto {
  @IsEnum(RsvpStatus)
  status: RsvpStatus;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  guestCount?: number;
}