import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpStatus,
  Logger,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { PermissionService } from '../services/permission.service';
import { PermissionsGuard } from '../guards';
import { RequirePermissions } from '../decorators/permissions.decorator';
import { ResourceType, ActionType } from '../entities/permission.entity';
import { plainToClass } from 'class-transformer';
import { PermissionResponseDto } from '../dto/role-response.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    [key: string]: any;
  };
}

@ApiTags('Permissions')
@Controller('permissions')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
export class PermissionsController {
  private readonly logger = new Logger(PermissionsController.name);

  constructor(private readonly permissionService: PermissionService) {}

  @Get()
  @RequirePermissions('permission.read')
  @ApiOperation({ summary: 'Get permission hierarchy' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission hierarchy retrieved successfully',
    type: [PermissionResponseDto],
  })
  async getPermissionHierarchy(): Promise<PermissionResponseDto[]> {
    this.logger.log('Getting permission hierarchy');

    const permissions = await this.permissionService.getPermissionHierarchy();

    return plainToClass(PermissionResponseDto, permissions, {
      excludeExtraneousValues: true,
    });
  }

  @Get('by-resource/:resourceType')
  @RequirePermissions('permission.read')
  @ApiOperation({ summary: 'Get permissions by resource type' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permissions retrieved successfully',
    type: [PermissionResponseDto],
  })
  async getPermissionsByResource(
    @Body('resourceType') resourceType: ResourceType,
  ): Promise<PermissionResponseDto[]> {
    this.logger.log(`Getting permissions for resource type: ${resourceType}`);

    const permissions = await this.permissionService.getPermissionsByResource(resourceType);

    return plainToClass(PermissionResponseDto, permissions, {
      excludeExtraneousValues: true,
    });
  }

  @Post()
  @RequirePermissions('permission.create')
  @ApiOperation({ summary: 'Create a new permission' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Permission created successfully',
    type: PermissionResponseDto,
  })
  async createPermission(
    @Body() createPermissionDto: {
      name: string;
      description: string;
      resourceType: ResourceType;
      actionType: ActionType;
      parentId?: number;
    },
    @Req() req: AuthenticatedRequest,
  ): Promise<PermissionResponseDto> {
    this.logger.log(`Creating permission '${createPermissionDto.name}' by user ${req.user.id}`);

    const permission = await this.permissionService.createPermission(
      createPermissionDto.name,
      createPermissionDto.description,
      createPermissionDto.resourceType,
      createPermissionDto.actionType,
      createPermissionDto.parentId,
    );

    return plainToClass(PermissionResponseDto, permission, {
      excludeExtraneousValues: true,
    });
  }
}