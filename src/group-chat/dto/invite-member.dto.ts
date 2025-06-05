import { IsString, IsUUID, IsOptional } from 'class-validator';

export class InviteMemberDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  inviteCode?: string;
}
