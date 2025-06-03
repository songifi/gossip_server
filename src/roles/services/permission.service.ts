import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository } from 'typeorm';
import { Cache } from 'cache-manager';
import { Permission, ResourceType, ActionType } from '../entities/permission.entity';

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: TreeRepository<Permission>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async createPermission(
    name: string,
    description: string,
    resourceType: ResourceType,
    actionType: ActionType,
    parentId?: number,
  ): Promise<Permission> {
    const existing = await this.permissionRepository.findOne({
      where: { name },
    });

    if (existing) {
      throw new BadRequestException('Permission with this name already exists');
    }

    const permission = this.permissionRepository.create({
      name,
      description,
      resourceType,
      actionType,
      systemPermission: true,
    });

    if (parentId) {
      const parent = await this.permissionRepository.findOne({
        where: { id: parentId },
      });
      
      if (!parent) {
        throw new NotFoundException('Parent permission not found');
      }
      
      permission.parent = parent;
    }

    const savedPermission = await this.permissionRepository.save(permission);
    await this.clearPermissionCache();

    return savedPermission;
  }

  async getPermissionHierarchy(): Promise<Permission[]> {
    const cacheKey = 'permissions:hierarchy';
    
    const cached = await this.cacheManager.get<Permission[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const permissions = await this.permissionRepository.findTrees();
    await this.cacheManager.set(cacheKey, permissions, 1800); // 30 minutes

    return permissions;
  }

  async getPermissionsByResource(resourceType: ResourceType): Promise<Permission[]> {
    return this.permissionRepository.find({
      where: { resourceType, active: true },
      order: { name: 'ASC' },
    });
  }

  private async clearPermissionCache(): Promise<void> {
    await this.cacheManager.del('permissions:hierarchy');
  }
}
