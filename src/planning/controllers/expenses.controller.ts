import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ExpenseService } from '../services/expense.service';
import { CreateExpenseDto } from '../dto/create-expense.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('events/expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post()
  create(@Body() createExpenseDto: CreateExpenseDto, @Request() req) {
    return this.expenseService.createExpense(createExpenseDto, req.user);
  }

  @Get('event/:eventId/summary')
  getExpenseSummary(@Param('eventId') eventId: string) {
    return this.expenseService.getExpenseSummary(eventId);
  }
}