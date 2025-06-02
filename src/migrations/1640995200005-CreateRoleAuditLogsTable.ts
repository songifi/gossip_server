import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateRoleAuditLogsTable1640995200005 implements MigrationInterface {
  name = 'CreateRoleAuditLogsTable1640995200005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'role_audit_logs',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'role_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'user_id',
            type: 'int',
          },
          {
            name: 'target_user_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'group_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'action',
            type: 'enum',
            enum: ['created', 'updated', 'deleted', 'assigned', 'unassigned', 'permission_added', 'permission_removed', 'bulk_assigned'],
          },
          {
            name: 'details',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['role_id'],
            referencedTableName: 'roles',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
            name: 'FK_ROLE_AUDIT_LOGS_ROLE',
          },
          {
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
            name: 'FK_ROLE_AUDIT_LOGS_USER',
          },
          {
            columnNames: ['target_user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
            name: 'FK_ROLE_AUDIT_LOGS_TARGET_USER',
          },
          {
            columnNames: ['group_id'],
            referencedTableName: 'groups',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
            name: 'FK_ROLE_AUDIT_LOGS_GROUP',
          },
        ],
        indices: [
          new Index('IDX_ROLE_AUDIT_LOGS_ROLE_DATE', ['role_id', 'created_at']),
          new Index('IDX_ROLE_AUDIT_LOGS_USER_DATE', ['user_id', 'created_at']),
          new Index('IDX_ROLE_AUDIT_LOGS_GROUP_DATE', ['group_id', 'created_at']),
          new Index('IDX_ROLE_AUDIT_LOGS_ACTION', ['action']),
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('role_audit_logs');
  }
}