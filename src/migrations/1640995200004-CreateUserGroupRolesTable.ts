import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateUserGroupRolesTable1640995200004 implements MigrationInterface {
  name = 'CreateUserGroupRolesTable1640995200004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user_group_roles',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'user_id',
            type: 'int',
          },
          {
            name: 'group_id',
            type: 'int',
          },
          {
            name: 'role_id',
            type: 'int',
          },
          {
            name: 'assigned_by',
            type: 'int',
          },
          {
            name: 'assigned_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
            name: 'FK_USER_GROUP_ROLES_USER',
          },
          {
            columnNames: ['group_id'],
            referencedTableName: 'groups',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
            name: 'FK_USER_GROUP_ROLES_GROUP',
          },
          {
            columnNames: ['role_id'],
            referencedTableName: 'roles',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
            name: 'FK_USER_GROUP_ROLES_ROLE',
          },
          {
            columnNames: ['assigned_by'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
            name: 'FK_USER_GROUP_ROLES_ASSIGNED_BY',
          },
        ],
        indices: [
          {
            name: 'IDX_USER_GROUP_ROLES_UNIQUE',
            columnNames: ['user_id', 'group_id'],
            isUnique: true,
          },
          {
            name: 'IDX_USER_GROUP_ROLES_ACTIVE',
            columnNames: ['user_id', 'group_id', 'active'],
          },
          {
            name: 'IDX_USER_GROUP_ROLES_EXPIRES',
            columnNames: ['expires_at'],
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user_group_roles');
  }
}
