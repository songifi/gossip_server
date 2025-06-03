import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { RoleAuditLog, AuditAction } from '../entities/role-audit-log.entity';

interface LogRoleActionParams {
  roleId?: number;
  userId: number;
  targetUserId?: number;
  groupId?: number;
  action: AuditAction;
  details: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(RoleAuditLog)
    private readonly auditLogRepository: Repository<RoleAuditLog>,
  ) {}

  async logRoleAction(
    params: LogRoleActionParams,
    queryRunner?: QueryRunner,
  ): Promise<RoleAuditLog> {
    const auditLog = this.auditLogRepository.create({
      roleId: params.roleId,
      userId: params.userId,
      targetUserId: params.targetUserId,
      groupId: params.groupId,
      action: params.action,
      details: params.details,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    const repository = queryRunner 
      ? queryRunner.manager.getRepository(RoleAuditLog)
      : this.auditLogRepository;

    const savedLog = await repository.save(auditLog);

    this.logger.log(
      `Audit log created: ${params.action} by user ${params.userId} ` +
      `${params.targetUserId ? `on user ${params.targetUserId}` : ''} ` +
      `${params.groupId ? `in group ${params.groupId}` : ''}`,
    );

    return savedLog;
  }

  async getAuditLogs(
    filters: {
      userId?: number;
      groupId?: number;
      roleId?: number;
      action?: AuditAction;
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ logs: RoleAuditLog[]; total: number }> {
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.role', 'role');

    if (filters.userId) {
      queryBuilder.andWhere('audit.userId = :userId', { userId: filters.userId });
    }

    if (filters.groupId) {
      queryBuilder.andWhere('audit.groupId = :groupId', { groupId: filters.groupId });
    }

    if (filters.roleId) {
      queryBuilder.andWhere('audit.roleId = :roleId', { roleId: filters.roleId });
    }

    if (filters.action) {
      queryBuilder.andWhere('audit.action = :action', { action: filters.action });
    }

    if (filters.startDate) {
      queryBuilder.andWhere('audit.createdAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      queryBuilder.andWhere('audit.createdAt <= :endDate', { endDate: filters.endDate });
    }

    const [logs, total] = await queryBuilder
      .orderBy('audit.createdAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getManyAndCount();

    return { logs, total };
  }
}