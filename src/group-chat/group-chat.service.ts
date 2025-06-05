import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupChat } from './entities/group-chat.entity';
import { GroupMember } from './entities/group-member.entity';
import { GroupMessage } from './entities/group-message.entity';
import { User } from '../users/entities/user.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { GroupRole } from './enums/group-role.enum';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GroupChatService {
  constructor(
    @InjectRepository(GroupChat)
    private groupRepository: Repository<GroupChat>,
    @InjectRepository(GroupMember)
    private memberRepository: Repository<GroupMember>,
    @InjectRepository(GroupMessage)
    private messageRepository: Repository<GroupMessage>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createGroup(
    createGroupDto: CreateGroupDto,
    creatorId: string,
  ): Promise<GroupChat> {
    const creator = await this.userRepository.findOne({
      where: { id: creatorId },
    });
    if (!creator) {
      throw new NotFoundException('User not found');
    }

    const group = this.groupRepository.create({
      ...createGroupDto,
      inviteCode: this.generateInviteCode(),
    });

    const savedGroup = await this.groupRepository.save(group);

    // Add creator as admin
    const creatorMember = this.memberRepository.create({
      user: creator,
      group: savedGroup,
      role: GroupRole.ADMIN,
    });
    await this.memberRepository.save(creatorMember);

    return this.findGroupById(savedGroup.id);
  }

  async findUserGroups(userId: string): Promise<GroupChat[]> {
    const memberships = await this.memberRepository.find({
      where: { user: { id: userId }, isActive: true },
      relations: ['group'],
    });
    return memberships.map((m) => m.group);
  }

  async findGroupById(id: string): Promise<GroupChat> {
    const group = await this.groupRepository.findOne({
      where: { id },
      relations: ['members', 'members.user'],
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    return group;
  }

  async updateGroup(
    id: string,
    updateGroupDto: UpdateGroupDto,
    userId: string,
  ): Promise<GroupChat> {
    await this.checkAdminPermission(id, userId);
    await this.groupRepository.update(id, updateGroupDto);
    return this.findGroupById(id);
  }

  async inviteMember(
    groupId: string,
    inviteDto: InviteMemberDto,
    inviterId: string,
  ): Promise<GroupMember> {
    const group = await this.findGroupById(groupId);
    const inviter = await this.getGroupMember(groupId, inviterId);

    if (
      !inviter ||
      ![GroupRole.ADMIN, GroupRole.MODERATOR].includes(inviter.role)
    ) {
      throw new ForbiddenException(
        'Only admins and moderators can invite members',
      );
    }

    if (group.members.length >= group.maxMembers) {
      throw new BadRequestException('Group has reached maximum member limit');
    }

    let user: User;
    if (inviteDto.userId) {
      user = await this.userRepository.findOne({
        where: { id: inviteDto.userId },
      });
    } else if (inviteDto.email) {
      user = await this.userRepository.findOne({
        where: { email: inviteDto.email },
      });
    } else {
      throw new BadRequestException('User ID or email is required');
    }

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingMember = await this.memberRepository.findOne({
      where: { user: { id: user.id }, group: { id: groupId } },
    });

    if (existingMember) {
      throw new BadRequestException('User is already a member');
    }

    const member = this.memberRepository.create({
      user,
      group,
      role: GroupRole.MEMBER,
    });

    return this.memberRepository.save(member);
  }

  async joinGroupByInvite(
    inviteCode: string,
    userId: string,
  ): Promise<GroupMember> {
    const group = await this.groupRepository.findOne({
      where: { inviteCode },
      relations: ['members'],
    });

    if (!group) {
      throw new NotFoundException('Invalid invite code');
    }

    if (group.members.length >= group.maxMembers) {
      throw new BadRequestException('Group has reached maximum member limit');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingMember = await this.memberRepository.findOne({
      where: { user: { id: userId }, group: { id: group.id } },
    });

    if (existingMember) {
      throw new BadRequestException('Already a member of this group');
    }

    const member = this.memberRepository.create({
      user,
      group,
      role: GroupRole.MEMBER,
    });

    return this.memberRepository.save(member);
  }

  async leaveGroup(groupId: string, userId: string): Promise<void> {
    const member = await this.memberRepository.findOne({
      where: { user: { id: userId }, group: { id: groupId } },
    });

    if (!member) {
      throw new NotFoundException('Not a member of this group');
    }

    await this.memberRepository.remove(member);
  }

  async removeMember(
    groupId: string,
    memberId: string,
    adminId: string,
  ): Promise<void> {
    const admin = await this.getGroupMember(groupId, adminId);
    if (
      !admin ||
      ![GroupRole.ADMIN, GroupRole.MODERATOR].includes(admin.role)
    ) {
      throw new ForbiddenException(
        'Only admins and moderators can remove members',
      );
    }

    const member = await this.memberRepository.findOne({
      where: { id: memberId, group: { id: groupId } },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === GroupRole.ADMIN && admin.role !== GroupRole.ADMIN) {
      throw new ForbiddenException('Cannot remove admin');
    }

    await this.memberRepository.remove(member);
  }

  async updateMemberRole(
    groupId: string,
    updateRoleDto: UpdateMemberRoleDto,
    adminId: string,
  ): Promise<GroupMember> {
    await this.checkAdminPermission(groupId, adminId);

    const member = await this.memberRepository.findOne({
      where: { id: updateRoleDto.memberId, group: { id: groupId } },
      relations: ['user'],
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    member.role = updateRoleDto.role;
    return this.memberRepository.save(member);
  }

  async sendMessage(
    groupId: string,
    content: string,
    senderId: string,
  ): Promise<GroupMessage> {
    const member = await this.getGroupMember(groupId, senderId);
    if (!member) {
      throw new ForbiddenException('Not a member of this group');
    }

    const group = await this.findGroupById(groupId);
    const sender = await this.userRepository.findOne({
      where: { id: senderId },
    });

    const message = this.messageRepository.create({
      content,
      sender,
      group,
    });

    // Update member activity
    member.lastActivity = new Date();
    await this.memberRepository.save(member);

    return this.messageRepository.save(message);
  }

  async getGroupMessages(
    groupId: string,
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<GroupMessage[]> {
    const member = await this.getGroupMember(groupId, userId);
    if (!member) {
      throw new ForbiddenException('Not a member of this group');
    }

    return this.messageRepository.find({
      where: { group: { id: groupId } },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getGroupMember(
    groupId: string,
    userId: string,
  ): Promise<GroupMember | null> {
    return this.memberRepository.findOne({
      where: { user: { id: userId }, group: { id: groupId } },
      relations: ['user'],
    });
  }

  async regenerateInviteCode(
    groupId: string,
    adminId: string,
  ): Promise<string> {
    await this.checkAdminPermission(groupId, adminId);
    const newCode = this.generateInviteCode();
    await this.groupRepository.update(groupId, { inviteCode: newCode });
    return newCode;
  }

  private async checkAdminPermission(
    groupId: string,
    userId: string,
  ): Promise<void> {
    const member = await this.getGroupMember(groupId, userId);
    if (!member || member.role !== GroupRole.ADMIN) {
      throw new ForbiddenException('Admin permission required');
    }
  }

  private generateInviteCode(): string {
    return uuidv4().substring(0, 8).toUpperCase();
  }
}
