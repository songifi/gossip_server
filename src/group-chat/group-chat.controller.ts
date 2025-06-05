import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { GroupChatService } from './group-chat.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { GroupPermissionGuard } from './guards/group-permission.guard';
import { GroupRole } from './enums/group-role.enum';
import { SetMetadata } from '@nestjs/common';

const Roles = (...roles: GroupRole[]) => SetMetadata('roles', roles);

@Controller('groups')
export class GroupChatController {
  constructor(private readonly groupChatService: GroupChatService) {}

  @Post()
  createGroup(@Body() createGroupDto: CreateGroupDto, @Request() req) {
    return this.groupChatService.createGroup(createGroupDto, req.user.id);
  }

  @Get('my-groups')
  getUserGroups(@Request() req) {
    return this.groupChatService.findUserGroups(req.user.id);
  }

  @Get(':id')
  getGroup(@Param('id') id: string) {
    return this.groupChatService.findGroupById(id);
  }

  @Put(':id')
  @UseGuards(GroupPermissionGuard)
  @Roles(GroupRole.ADMIN)
  updateGroup(
    @Param('id') id: string,
    @Body() updateGroupDto: UpdateGroupDto,
    @Request() req,
  ) {
    return this.groupChatService.updateGroup(id, updateGroupDto, req.user.id);
  }

  @Post(':id/invite')
  @UseGuards(GroupPermissionGuard)
  @Roles(GroupRole.ADMIN, GroupRole.MODERATOR)
  inviteMember(
    @Param('id') groupId: string,
    @Body() inviteDto: InviteMemberDto,
    @Request() req,
  ) {
    return this.groupChatService.inviteMember(groupId, inviteDto, req.user.id);
  }

  @Post('join/:inviteCode')
  joinGroup(@Param('inviteCode') inviteCode: string, @Request() req) {
    return this.groupChatService.joinGroupByInvite(inviteCode, req.user.id);
  }

  @Delete(':id/leave')
  leaveGroup(@Param('id') groupId: string, @Request() req) {
    return this.groupChatService.leaveGroup(groupId, req.user.id);
  }

  @Delete(':id/members/:memberId')
  @UseGuards(GroupPermissionGuard)
  @Roles(GroupRole.ADMIN, GroupRole.MODERATOR)
  removeMember(
    @Param('id') groupId: string,
    @Param('memberId') memberId: string,
    @Request() req,
  ) {
    return this.groupChatService.removeMember(groupId, memberId, req.user.id);
  }

  @Put(':id/members/role')
  @UseGuards(GroupPermissionGuard)
  @Roles(GroupRole.ADMIN)
  updateMemberRole(
    @Param('id') groupId: string,
    @Body() updateRoleDto: UpdateMemberRoleDto,
    @Request() req,
  ) {
    return this.groupChatService.updateMemberRole(
      groupId,
      updateRoleDto,
      req.user.id,
    );
  }

  @Post(':id/messages')
  sendMessage(
    @Param('id') groupId: string,
    @Body('content') content: string,
    @Request() req,
  ) {
    return this.groupChatService.sendMessage(groupId, content, req.user.id);
  }

  @Get(':id/messages')
  getMessages(
    @Param('id') groupId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Request() req,
  ) {
    return this.groupChatService.getGroupMessages(
      groupId,
      req.user.id,
      limit,
      offset,
    );
  }

  @Post(':id/invite-code/regenerate')
  @UseGuards(GroupPermissionGuard)
  @Roles(GroupRole.ADMIN)
  regenerateInviteCode(@Param('id') groupId: string, @Request() req) {
    return this.groupChatService.regenerateInviteCode(groupId, req.user.id);
  }
}
