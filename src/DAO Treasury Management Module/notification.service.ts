import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

export interface NotificationPayload {
  groupChatId: string;
  type: 'proposal_created' | 'proposal_executed' | 'vote_cast' | 'treasury_update' | 'budget_alert';
  title: string;
  message: string;
  data?: any;
}

@Injectable()
export class NotificationService {
  constructor(private httpService: HttpService) {}

  async sendGroupNotification(payload: NotificationPayload): Promise<void> {
    try {
      // Integration with your group chat system (Telegram, Discord, etc.)
      // This is a mock implementation
      console.log(`Notification sent to group ${payload.groupChatId}:`, payload);
      
      // Example for webhook-based notifications
      // await firstValueFrom(
      //   this.httpService.post('YOUR_WEBHOOK_URL', {
      //     chat_id: payload.groupChatId,
      //     text: `${payload.title}\n\n${payload.message}`,
      //     parse_mode: 'HTML'
      //   })
      // );
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  async notifyProposalCreated(treasury: any, proposal: any): Promise<void> {
    await this.sendGroupNotification({
      groupChatId: treasury.groupChatId,
      type: 'proposal_created',
      title: '📝 New Proposal Created',
      message: `<b>${proposal.title}</b>\n\nType: ${proposal.type}\nRequested: ${proposal.requestedAmount} ${proposal.requestedTokenSymbol}\nVoting ends: ${proposal.votingEndTime.toDateString()}\n\n${proposal.description}`,
      data: { proposalId: proposal.id }
    });
  }

  async notifyProposalExecuted(treasury: any, proposal: any): Promise<void> {
    await this.sendGroupNotification({
      groupChatId: treasury.groupChatId,
      type: 'proposal_executed',
      title: '✅ Proposal Executed',
      message: `<b>${proposal.title}</b> has been successfully executed!\n\nTransaction Hash: ${proposal.executionTxHash}`,
      data: { proposalId: proposal.id, txHash: proposal.executionTxHash }
    });
  }

  async notifyVoteCast(treasury: any, proposal: any, vote: any): Promise<void> {
    const voteText = vote.support ? '👍 YES' : '👎 NO';
    await this.sendGroupNotification({
      groupChatId: treasury.groupChatId,
      type: 'vote_cast',
      title: '🗳️ New Vote Cast',
      message: `Vote cast on <b>${proposal.title}</b>\n\n${voteText} - ${vote.votingPower} voting power\n\nReason: ${vote.reason || 'No reason provided'}`,
      data: { proposalId: proposal.id, voteId: vote.id }
    });
  }

  async notifyTreasuryUpdate(treasury: any, balanceChange: any): Promise<void> {
    await this.sendGroupNotification({
      groupChatId: treasury.groupChatId,
      type: 'treasury_update',
      title: '💰 Treasury Update',
      message: `Treasury balance updated!\n\nNew total value: ${treasury.totalValue.toLocaleString()}\n\nRecent change: ${balanceChange.type} of ${balanceChange.amount} ${balanceChange.token}`,
      data: { treasuryId: treasury.id }
    });
  }

  async notifyBudgetAlert(treasury: any, budget: any): Promise<void> {
    const utilizationPercentage = (budget.spentAmount / budget.allocatedAmount) * 100;
    
    if (utilizationPercentage >= 80) {
      await this.sendGroupNotification({
        groupChatId: treasury.groupChatId,
        type: 'budget_alert',
        title: '⚠️ Budget Alert',
        message: `<b>${budget.category}</b> budget is ${utilizationPercentage.toFixed(1)}% utilized\n\nSpent: ${budget.spentAmount} ${budget.tokenSymbol}\nAllocated: ${budget.allocatedAmount} ${budget.tokenSymbol}\nRemaining: ${budget.allocatedAmount - budget.spentAmount} ${budget.tokenSymbol}`,
        data: { budgetId: budget.id, utilizationPercentage }
      });
    }
  }
}
