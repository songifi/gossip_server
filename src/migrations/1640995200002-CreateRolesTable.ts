import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateRolesTable1640995200002 implements MigrationInterface {
  name = 'CreateRolesTable1640995200002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'roles',
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
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['system', 'custom'],
            default: "'custom'",
          },
          {
            name: 'level',
            type: 'enum',
            enum: ['0', '1', '2', '3', '4'],
            default: '3',
          },
          {
            name: 'active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'is_default',
            type: 'boolean',
            default: false,
          },
          {
            name: 'group_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'int',
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
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
            referencedTableName: 'roles',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
            name: 'FK_ROLES_PARENT',
          },
          {
            columnNames: ['created_by'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
            name: 'FK_ROLES_CREATED_BY',
          },
        ],
        indices: [
          new Index('IDX_ROLES_NAME_GROUP', ['name', 'group_id'], { isUnique: true }),
          new Index('IDX_ROLES_GROUP', ['group_id']),
          new Index('IDX_ROLES_MPATH', ['mpath']),
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('roles');
  }
}
