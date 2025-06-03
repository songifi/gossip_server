import { DataSource } from 'typeorm';
import { Role, RoleType, RoleLevel } from '../../roles/entities/role.entity';
import { Permission } from '../../roles/entities/permission.entity';

export class DefaultRolesSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const roleRepository = dataSource.getRepository(Role);
    const permissionRepository = dataSource.getRepository(Permission);

    // Get permissions
    const allPermissions = await permissionRepository.find();
    const adminPermissions = allPermissions.filter(p => 
      p.name.includes('create') || p.name.includes('update') || 
      p.name.includes('delete') || p.name.includes('manage') || p.name.includes('assign')
    );
    const moderatorPermissions = allPermissions.filter(p => 
      p.name.includes('user.') || p.name.includes('message.delete') || p.name.includes('role.read')
    );
    const memberPermissions = allPermissions.filter(p => 
      p.name.includes('read') || p.name === 'message.create'
    );

    const defaultRoles = [
      {
        name: 'Super Admin',
        description: 'Full system access',
        type: RoleType.SYSTEM,
        level: RoleLevel.SUPER_ADMIN,
        permissions: allPermissions,
      },
      {
        name: 'Admin',
        description: 'Group administrator with full permissions',
        type: RoleType.SYSTEM,
        level: RoleLevel.ADMIN,
        permissions: adminPermissions,
      },
      {
        name: 'Moderator',
        description: 'Can moderate users and messages',
        type: RoleType.SYSTEM,
        level: RoleLevel.MODERATOR,
        permissions: moderatorPermissions,
      },
      {
        name: 'Member',
        description: 'Regular group member',
        type: RoleType.SYSTEM,
        level: RoleLevel.MEMBER,
        isDefault: true,
        permissions: memberPermissions,
      },
      {
        name: 'Guest',
        description: 'Limited access guest',
        type: RoleType.SYSTEM,
        level: RoleLevel.GUEST,
        permissions: memberPermissions.filter(p => p.name.includes('read')),
      },
    ];

    for (const roleData of defaultRoles) {
      const existing = await roleRepository.findOne({
        where: { name: roleData.name, groupId: null },
      });

      if (!existing) {
        const role = roleRepository.create({
          ...roleData,
          createdBy: 1, // System user
          groupId: null, // System role
        });
        role.permissions = roleData.permissions;
        await roleRepository.save(role);
      }
    }

    console.log('Default roles seeded successfully');
  }
}
