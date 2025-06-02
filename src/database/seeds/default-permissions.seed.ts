import { DataSource } from 'typeorm';
import { Permission, ResourceType, ActionType } from '../../roles/entities/permission.entity';

export class DefaultPermissionsSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const permissionRepository = dataSource.getRepository(Permission);

    const permissions = [
      // Group permissions
      { name: 'group.create', description: 'Create groups', resourceType: ResourceType.GROUP, actionType: ActionType.CREATE },
      { name: 'group.read', description: 'View group details', resourceType: ResourceType.GROUP, actionType: ActionType.READ },
      { name: 'group.update', description: 'Update group settings', resourceType: ResourceType.GROUP, actionType: ActionType.UPDATE },
      { name: 'group.delete', description: 'Delete groups', resourceType: ResourceType.GROUP, actionType: ActionType.DELETE },
      { name: 'group.manage', description: 'Full group management', resourceType: ResourceType.GROUP, actionType: ActionType.MANAGE },

      // Message permissions
      { name: 'message.create', description: 'Send messages', resourceType: ResourceType.MESSAGE, actionType: ActionType.CREATE },
      { name: 'message.read', description: 'Read messages', resourceType: ResourceType.MESSAGE, actionType: ActionType.READ },
      { name: 'message.update', description: 'Edit messages', resourceType: ResourceType.MESSAGE, actionType: ActionType.UPDATE },
      { name: 'message.delete', description: 'Delete messages', resourceType: ResourceType.MESSAGE, actionType: ActionType.DELETE },

      // User permissions
      { name: 'user.invite', description: 'Invite users to group', resourceType: ResourceType.USER, actionType: ActionType.INVITE },
      { name: 'user.kick', description: 'Remove users from group', resourceType: ResourceType.USER, actionType: ActionType.KICK },
      { name: 'user.ban', description: 'Ban users from group', resourceType: ResourceType.USER, actionType: ActionType.BAN },
      { name: 'user.mute', description: 'Mute users in group', resourceType: ResourceType.USER, actionType: ActionType.MUTE },

      // Role permissions
      { name: 'role.create', description: 'Create roles', resourceType: ResourceType.ROLE, actionType: ActionType.CREATE },
      { name: 'role.read', description: 'View roles', resourceType: ResourceType.ROLE, actionType: ActionType.READ },
      { name: 'role.update', description: 'Update roles', resourceType: ResourceType.ROLE, actionType: ActionType.UPDATE },
      { name: 'role.delete', description: 'Delete roles', resourceType: ResourceType.ROLE, actionType: ActionType.DELETE },
      { name: 'role.assign', description: 'Assign roles to users', resourceType: ResourceType.ROLE, actionType: ActionType.MANAGE },
      { name: 'role.audit', description: 'View role audit logs', resourceType: ResourceType.ROLE, actionType: ActionType.READ },

      // System permissions
      { name: 'system.admin', description: 'System administration', resourceType: ResourceType.SYSTEM, actionType: ActionType.MANAGE },
      { name: 'permission.create', description: 'Create permissions', resourceType: ResourceType.SYSTEM, actionType: ActionType.CREATE },
      { name: 'permission.read', description: 'View permissions', resourceType: ResourceType.SYSTEM, actionType: ActionType.READ },
    ];

    for (const permissionData of permissions) {
      const existing = await permissionRepository.findOne({
        where: { name: permissionData.name },
      });

      if (!existing) {
        const permission = permissionRepository.create({
          ...permissionData,
          systemPermission: true,
        });
        await permissionRepository.save(permission);
      }
    }

    console.log('Default permissions seeded successfully');
  }
}
