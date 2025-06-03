import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository, In, DataSource } from 'typeorm';
import { Cache } from 'cache-manager';
import { Role, RoleType, RoleLevel } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { UserGroupRole } from '../entities/user-group-role.entity';
import { CreateRoleDto, UpdateRoleDto, AssignRoleDto, BulkAssignRolesDto } from '../dto';
import { AuditService } from './audit.service';
import { AuditAction } from '../entities/role-audit-log.entity';

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: TreeRepository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: TreeRepository<Permission>,
    @InjectRepository(UserGroupRole)
    private readonly userGroupRoleRepository: Repository<UserGroupRole>,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async createRole(
    createRoleDto: CreateRoleDto,
    createdBy: number,
    groupId?: number,
  ): Promise<Role> {
    this.logger.log(`Creating role: ${createRoleDto.name} for group: ${groupId}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingRole = await this.roleRepository.findOne({
        where: { name: createRoleDto.name, groupId: groupId || null },
      });

      if (existingRole) {
        throw new BadRequestException('Role with this name already exists');
      }

      const role = this.roleRepository.create({
        ...createRoleDto,
        type: RoleType.CUSTOM,
        groupId,
        createdBy,
      });

      if (createRoleDto.parentRoleId) {
        const parentRole = await this.roleRepository.findOne({
          where: { id: createRoleDto.parentRoleId },
        });
        
        if (!parentRole) {
          throw new NotFoundException('Parent role not found');
        }
        
        if (createRoleDto.level === undefined) {
          throw new BadRequestException('Role level must be specified when assigning a parent role');
        }
        if (parentRole.level >= createRoleDto.level) {
          throw new BadRequestException('Child role level must be greater than parent level');
        }
        
        role.parent = parentRole;
      }

      if (Array.isArray(createRoleDto.permissionIds) && createRoleDto.permissionIds.length > 0) {
        const permissions = await this.permissionRepository.findBy({
          id: In(createRoleDto.permissionIds),
          active: true,
        });
        
        if (permissions.length !== createRoleDto.permissionIds.length) {
          throw new BadRequestException('Some permissions not found or inactive');
        }
        
        role.permissions = permissions;
      }

      const savedRole = await queryRunner.manager.save(Role, role);

      await this.auditService.logRoleAction({
        roleId: savedRole.id,
        userId: createdBy,
        groupId,
        action: AuditAction.CREATED,
        details: { role: savedRole },
      }, queryRunner);

      await queryRunner.commitTransaction();

      await this.clearRoleCache(groupId);

      this.logger.log(`Role created successfully: ${savedRole.name} (ID: ${savedRole.id})`);
      return savedRole;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create role: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateRole(
    id: number,
    updateRoleDto: UpdateRoleDto,
    updatedBy: number,
  ): Promise<Role> {
    this.logger.log(`Updating role: ${id}`);

    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions', 'parent'],
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.type === RoleType.SYSTEM) {
      throw new ForbiddenException('Cannot modify system roles');
    }

    const oldRole = { ...role };

    Object.assign(role, updateRoleDto);

    if (updateRoleDto.permissionIds) {
      const permissions = await this.permissionRepository.findBy({
        id: In(updateRoleDto.permissionIds),
        active: true,
      });
      role.permissions = permissions;
    }

    const updatedRole = await this.roleRepository.save(role);

    await this.auditService.logRoleAction({
      roleId: id,
      userId: updatedBy,
      groupId: role.groupId,
      action: AuditAction.UPDATED,
      details: { oldRole, newRole: updatedRole },
    });

    await this.clearRoleCache(role.groupId);

    return updatedRole;
  }

  async assignRole(
    assignRoleDto: AssignRoleDto,
    assignedBy: number,
    groupId: number,
  ): Promise<UserGroupRole> {
    this.logger.log(`Assigning role ${assignRoleDto.roleId} to user ${assignRoleDto.userId} in group ${groupId}`);

    const role = await this.roleRepository.findOne({
      where: { id: assignRoleDto.roleId, active: true },
    });

    if (!role) {
      throw new NotFoundException('Role not found or inactive');
    }

   if (role.groupId && role.groupId !== groupId) {
      throw new BadRequestException('Role does not belong to this group');
    }

    const existingAssignment = await this.userGroupRoleRepository.findOne({
      where: { userId: assignRoleDto.userId, groupId, active: true },
    });

    let assignment: UserGroupRole;

    if (existingAssignment) {
      existingAssignment.roleId = assignRoleDto.roleId;
      existingAssignment.assignedBy = assignedBy;
      existingAssignment.assignedAt = new Date();
      existingAssignment.expiresAt = assignRoleDto.expiresAt ? new Date(assignRoleDto.expiresAt) : undefined;
      existingAssignment.metadata = assignRoleDto.metadata;

      assignment = await this.userGroupRoleRepository.save(existingAssignment);
    } else {
      assignment = this.userGroupRoleRepository.create({
        userId: assignRoleDto.userId,
        groupId,
        roleId: assignRoleDto.roleId,
        assignedBy,
        expiresAt: assignRoleDto.expiresAt ? new Date(assignRoleDto.expiresAt) : null,
        metadata: assignRoleDto.metadata,
      });

      assignment = await this.userGroupRoleRepository.save(assignment);
    }

    await this.auditService.logRoleAction({
      roleId: assignRoleDto.roleId,
      userId: assignedBy,
      targetUserId: assignRoleDto.userId,
      groupId,
      action: AuditAction.ASSIGNED,
      details: { assignment },
    });

    await this.clearUserRoleCache(assignRoleDto.userId, groupId);

    return assignment;
  }

  async bulkAssignRoles(
    bulkAssignDto: BulkAssignRolesDto,
    assignedBy: number,
    groupId: number,
  ): Promise<{ successful: UserGroupRole[]; failed: any[] }> {
    this.logger.log(`Bulk assigning ${bulkAssignDto.assignments.length} roles in group ${groupId}`);

    const successful: UserGroupRole[] = [];
    const failed: any[] = [];

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const assignment of bulkAssignDto.assignments) {
        try {
          const result = await this.assignRole(assignment, assignedBy, groupId);
          successful.push(result);
        } catch (error) {
          failed.push({
            assignment,
            error: error.message,
          });
        }
      }

      await this.auditService.logRoleAction({
        userId: assignedBy,
        groupId,
        action: AuditAction.BULK_ASSIGNED,
        details: {
          totalAssignments: bulkAssignDto.assignments.length,
          successful: successful.length,
          failed: failed.length,
          failedAssignments: failed,
        },
      }, queryRunner);

      await queryRunner.commitTransaction();

      const userIds = successful.map(s => s.userId);
      await Promise.all(userIds.map(userId => this.clearUserRoleCache(userId, groupId)));

      return { successful, failed };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getUserPermissions(
    userId: number,
    groupId: number,
  ): Promise<Permission[]> {
    const cacheKey = `user:${userId}:group:${groupId}:permissions`;
    
    const cached = await this.cacheManager.get<Permission[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const userRole = await this.userGroupRoleRepository.findOne({
      where: { 
        userId, 
        groupId, 
        active: true,
      },
      relations: ['role', 'role.permissions', 'role.parent'],
    });

    if (!userRole) {
      return [];
    }

    const permissions = await this.getInheritedPermissions(userRole.role);

    await this.cacheManager.set(cacheKey, permissions, 300);

    return permissions;
  }

  async getInheritedPermissions(role: Role): Promise<Permission[]> {
    const permissionsMap = new Map<number, Permission>();

    const collectPermissions = async (currentRole: Role): Promise<void> => {
      if (currentRole.permissions) {
        for (const permission of currentRole.permissions) {
          permissionsMap.set(permission.id, permission);
          
          const children = await this.permissionRepository.findDescendants(permission);
          children.forEach(child => permissionsMap.set(child.id, child));
        }
      }

      if (currentRole.parent) {
        await collectPermissions(currentRole.parent);
      }
    };

    await collectPermissions(role);

    return Array.from(permissionsMap.values());
  }

  async hasPermission(
    userId: number,
    groupId: number,
    permissionName: string,
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, groupId);
    return permissions.some(permission => permission.name === permissionName);
  }

  async getUserRole(userId: number, groupId: number): Promise<Role | null> {
    const cacheKey = `user:${userId}:group:${groupId}:role`;
    
    const cached = await this.cacheManager.get<Role>(cacheKey);
    if (cached) {
      return cached;
    }

    const userGroupRole = await this.userGroupRoleRepository.findOne({
      where: { userId, groupId, active: true },
      relations: ['role'],
    });

    if (!userGroupRole) {
      return null;
    }

    await this.cacheManager.set(cacheKey, userGroupRole.role, 300);
    return userGroupRole.role;
  }

  async getRoleHierarchy(groupId?: number): Promise<Role[]> {
    const cacheKey = `roles:hierarchy:${groupId || 'system'}`;
    
    const cached = await this.cacheManager.get<Role[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const roles = await this.roleRepository.findTrees({
      relations: ['permissions'],
    });

    const filteredRoles = groupId 
      ? roles.filter(role => role.groupId === groupId || role.groupId === null)
      : roles;

    await this.cacheManager.set(cacheKey, filteredRoles, 600); // 10 minutes

    return filteredRoles;
  }

  async deleteRole(id: number, deletedBy: number): Promise<void> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['userGroupRoles'],
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.type === RoleType.SYSTEM) {
      throw new ForbiddenException('Cannot delete system roles');
    }

    if (role.userGroupRoles?.length > 0) {
      throw new BadRequestException('Cannot delete role that is assigned to users');
    }

    await this.roleRepository.softDelete(id);

    await this.auditService.logRoleAction({
      roleId: id,
      userId: deletedBy,
      groupId: role.groupId,
      action: AuditAction.DELETED,
      details: { deletedRole: role },
    });

    await this.clearRoleCache(role.groupId);
  }

  private async clearRoleCache(groupId?: number): Promise<void> {
    const patterns = [
      `roles:hierarchy:${groupId || 'system'}`,
      `user:*:group:${groupId}:*`,
    ];

    for (const pattern of patterns) {
      await this.cacheManager.del(pattern);
    }
  }

  private async clearUserRoleCache(userId: number, groupId: number): Promise<void> {
    const keys = [
      `user:${userId}:group:${groupId}:permissions`,
      `user:${userId}:group:${groupId}:role`,
    ];

    for (const key of keys) {
      await this.cacheManager.del(key);
    }
  }
}
