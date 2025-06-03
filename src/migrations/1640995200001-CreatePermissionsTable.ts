import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreatePermissionsTable1640995200001 implements MigrationInterface {
  name = 'CreatePermissionsTable1640995200001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'permissions',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'resource_type',
            type: 'enum',
            enum: ['group', 'message', 'user', 'role', 'system'],
          },
          {
            name: 'action_type',
            type: 'enum',
            enum: ['create', 'read', 'update', 'delete', 'manage', 'invite', 'kick', 'ban', 'mute'],
          },
          {
            name: 'active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'system_permission',
            type: 'boolean',
            default: false,
          },
          {
            name: 'mpath',
            type: 'varchar',
            length: '255',
            default: "''",
          },
          {
            name: 'parent_id',
            type: 'int',
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
            columnNames: ['parent_id'],
            referencedTableName: 'permissions',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
            name: 'FK_PERMISSIONS_PARENT',
          },
        ],
        indices: [
          new Index('IDX_PERMISSIONS_RESOURCE_ACTION', ['resource_type', 'action_type'], { isUnique: true }),
          new Index('IDX_PERMISSIONS_MPATH', ['mpath']),
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('permissions');
  }
}
