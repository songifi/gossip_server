import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventExpense } from '../entities/event-expense.entity';
import { ExpenseSplit } from '../entities/expense-split.entity';
import { CreateExpenseDto } from '../dto/create-expense.dto';
import { User } from '../../users/entities/user.entity';
import { EventsService } from './events.service';

@Injectable()
export class ExpenseService {
  constructor(
    @InjectRepository(EventExpense)
    private expenseRepository: Repository<EventExpense>,
    @InjectRepository(ExpenseSplit)
    private splitRepository: Repository<ExpenseSplit>,
    private eventsService: EventsService,
  ) {}

  async createExpense(createExpenseDto: CreateExpenseDto, paidBy: User): Promise<EventExpense> {
    const event = await this.eventsService.findOne(createExpenseDto.eventId);
    
    const expense = this.expenseRepository.create({
      ...createExpenseDto,
      paidBy,
      event,
    });

    const savedExpense = await this.expenseRepository.save(expense);

    // Create equal splits for all attendees
    if (event.costSharingEnabled) {
      await this.createEqualSplits(savedExpense, event);
    }

    return this.expenseRepository.findOne({
      where: { id: savedExpense.id },
      relations: ['splits', 'splits.user'],
    });
  }

  private async createEqualSplits(expense: EventExpense, event: any) {
    const attendees = event.rsvps.filter(rsvp => rsvp.status === 'going');
    const splitAmount = expense.amount / attendees.length;

    const splits = attendees.map(rsvp => 
      this.splitRepository.create({
        expense,
        user: rsvp.user,
        amount: splitAmount,
      })
    );

    await this.splitRepository.save(splits);
  }

  async getExpenseSummary(eventId: string) {
    const expenses = await this.expenseRepository.find({
      where: { event: { id: eventId } },
      relations: ['paidBy', 'splits', 'splits.user'],
    });

    const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    
    // Calculate who owes whom
    const balances = new Map<string, number>();
    
    for (const expense of expenses) {
      // Person who paid gets credited
      const payerId = expense.paidBy.id;
      balances.set(payerId, (balances.get(payerId) || 0) + Number(expense.amount));
      
      // People who owe get debited
      for (const split of expense.splits) {
        const userId = split.user.id;
        balances.set(userId, (balances.get(userId) || 0) - Number(split.amount));
      }
    }

    return {
      totalExpenses,
      balances: Array.from(balances.entries()).map(([userId, balance]) => ({
        userId,
        balance: Number(balance.toFixed(2)),
      })),
      expenses,
    };
  }
}