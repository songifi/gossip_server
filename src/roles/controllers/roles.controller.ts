import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  ParseIntPipe,
  HttpStatus,
  Logger,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { RoleService } from '../services/role.service';
import { PermissionService } from '../services/permission.service';
import { AuditService } from '../services/audit.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  AssignRoleDto,
  BulkAssignRolesDto,
  RoleResponseDto,
  RoleHierarchyQueryDto,
} from '../dto';
import { PermissionsGuard, RolesGuard } from '../guards';
import { PermissionLoggingInterceptor } from '../interceptors/permission-logging.interceptor';
import { RequirePermissions, GroupPermissions } from '../decorators/permissions.decorator';
import { RequireRoles, AdminOnly, ModeratorOrHigher } from '../decorators/roles.decorator';
import { RoleLevel } from '../entities/index';
import { plainToClass, plainToInstance } from 'class-transformer';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    [key: string]: any;
  };
}

@ApiTags('Roles')
@Controller('groups/:groupId/roles')
@ApiBearerAuth()
@UseGuards(PermissionsGuard, RolesGuard)
@UseInterceptors(PermissionLoggingInterceptor)
export class RolesController {
  private readonly logger = new Logger(RolesController.name);

  constructor(
    private readonly roleService: RoleService,
    private readonly permissionService: PermissionService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @GroupPermissions('role.create')
  @RequireRoles(RoleLevel.ADMIN)
  @ApiOperation({ summary: 'Create a new role in a group' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Role created successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid role data or role name already exists',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions to create roles',
  })
  async createRole(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() createRoleDto: CreateRoleDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<RoleResponseDto> {
    this.logger.log(`Creating role '${createRoleDto.name}' in group ${groupId} by user ${req.user.id}`);

    const role = await this.roleService.createRole(
      createRoleDto,
      req.user.id,
      groupId,
    );

    return plainToClass(RoleResponseDto, role, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @GroupPermissions('role.read')
  @ApiOperation({ summary: 'Get role hierarchy for a group' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiQuery({ name: 'includePermissions', required: false, type: Boolean })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role hierarchy retrieved successfully',
    type: [RoleResponseDto],
  })
  async getRoleHierarchy(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Query() queryDto: RoleHierarchyQueryDto,
  ): Promise<RoleResponseDto[]> {
    this.logger.log(`Getting role hierarchy for group ${groupId}`);

    const roles = await this.roleService.getRoleHierarchy(groupId);

    return plainToInstance(RoleResponseDto, roles, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':roleId')
  @GroupPermissions('role.read')
  @ApiOperation({ summary: 'Get a specific role' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role retrieved successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role not found',
  })
  async getRole(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('roleId', ParseIntPipe) roleId: number,
  ): Promise<RoleResponseDto> {
    this.logger.log(`Getting role ${roleId} in group ${groupId}`);

    const role = await this.roleService.getRoleById(roleId);

    return plainToClass(RoleResponseDto, role, {
      excludeExtraneousValues: true,
    });
  }

  @Put(':roleId')
  @GroupPermissions('role.update')
  @RequireRoles(RoleLevel.ADMIN)
  @ApiOperation({ summary: 'Update a role' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role updated successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot modify system roles',
  })
  async updateRole(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body() updateRoleDto: UpdateRoleDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<RoleResponseDto> {
    this.logger.log(`Updating role ${roleId} in group ${groupId} by user ${req.user.id}`);

    const role = await this.roleService.updateRole(
      roleId,
      updateRoleDto,
      req.user.id,
    );

    return plainToClass(RoleResponseDto, role, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':roleId')
  @GroupPermissions('role.delete')
  @AdminOnly()
  @ApiOperation({ summary: 'Delete a role' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Role deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete role that is assigned to users',
  })
  async deleteRole(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('roleId', ParseIntPipe) roleId: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    this.logger.log(`Deleting role ${roleId} in group ${groupId} by user ${req.user.id}`);

    await this.roleService.deleteRole(roleId, req.user.id);
  }

  @Post('assign')
  @GroupPermissions('role.assign')
  @ModeratorOrHigher()
  @ApiOperation({ summary: 'Assign a role to a user' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Role assigned successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Role does not belong to this group',
  })
  async assignRole(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() assignRoleDto: AssignRoleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.logger.log(
      `Assigning role ${assignRoleDto.roleId} to user ${assignRoleDto.userId} in group ${groupId} by user ${req.user.id}`,
    );

    return this.roleService.assignRole(
      assignRoleDto,
      req.user.id,
      groupId,
    );
  }

  @Post('bulk-assign')
  @GroupPermissions('role.assign')
  @AdminOnly()
  @ApiOperation({ summary: 'Bulk assign roles to multiple users' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Bulk role assignment completed',
    schema: {
      type: 'object',
      properties: {
        successful: { type: 'array' },
        failed: { type: 'array' },
      },
    },
  })
  async bulkAssignRoles(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() bulkAssignDto: BulkAssignRolesDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.logger.log(
      `Bulk assigning ${bulkAssignDto.assignments.length} roles in group ${groupId} by user ${req.user.id}`,
    );

    return this.roleService.bulkAssignRoles(
      bulkAssignDto,
      req.user.id,
      groupId,
    );
  }

  @Get('audit/logs')
  @GroupPermissions('role.audit')
  @ModeratorOrHigher()
  @ApiOperation({ summary: 'Get role audit logs' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'roleId', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Audit logs retrieved successfully',
  })
  async getAuditLogs(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Query('limit', ParseIntPipe) limit: number = 50,
    @Query('offset', ParseIntPipe) offset: number = 0,
    @Query('userId') userId?: number,
    @Query('roleId') roleId?: number,
  ) {
    this.logger.log(`Getting audit logs for group ${groupId}`);

    return this.auditService.getAuditLogs(
      {
        groupId,
        userId,
        roleId,
      },
      limit,
      offset,
    );
  }
}
