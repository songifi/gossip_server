async syncTransactionsFromBlockchain(treasuryId: string): Promise<void> {
  const treasury = await this.getTreasury(treasuryId);
  
  // Get latest transactions from blockchain
  const ethTransactions = await this.blockchainService.getTransactionHistory(treasury.multiSigAddress);
  const tokenTransfers = await this.blockchainService.getTokenTransfers(treasury.multiSigAddress);
  
  // Process ETH transactions
  for (const tx of ethTransactions) {
    const existingTx = await this.transactionRepository.findOne({
      where: { txHash: tx.hash }
    });
    
    if (!existingTx) {
      const transaction = this.transactionRepository.create({
        treasury,
        txHash: tx.hash,
        type: tx.to.toLowerCase() === treasury.multiSigAddress.toLowerCase() 
          ? TransactionType.DEPOSIT 
          : TransactionType.WITHDRAWAL,
        from: tx.from,
        to: tx.to,
        amount: parseFloat(tx.value) / Math.pow(10, 18),
        tokenAddress: '0x0000000000000000000000000000000000000000', // ETH
        tokenSymbol: 'ETH',
        usdValue: 0, // Would calculate based on historical price
        blockNumber: parseInt(tx.blockNumber),
        timestamp: new Date(parseInt(tx.timeStamp) * 1000)
      });
      
      await this.transactionRepository.save(transaction);
    }
  }
  
  // Process token transfers
  for (const transfer of tokenTransfers) {
    const existingTx = await this.transactionRepository.findOne({
      where: { txHash: transfer.hash }
    });
    
    if (!existingTx) {
      const transaction = this.transactionRepository.create({
        treasury,
        txHash: transfer.hash,
        type: transfer.to.toLowerCase() === treasury.multiSigAddress.toLowerCase()
          ? TransactionType.DEPOSIT
          : TransactionType.WITHDRAWAL,
        from: transfer.from,
        to: transfer.to,
        amount: parseFloat(transfer.value) / Math.pow(10, parseInt(transfer.tokenDecimal)),
        tokenAddress: transfer.contractAddress,
        tokenSymbol: transfer.tokenSymbol,
        usdValue: 0, // Would calculate based on historical price
        blockNumber: parseInt(transfer.blockNumber),
        timestamp: new Date(parseInt(transfer.timeStamp) * 1000)
      });
      
      await this.transactionRepository.save(transaction);
    }
  }
}

async getProposalsByStatus(treasuryId: string, status?: ProposalStatus): Promise<Proposal[]> {
  const whereCondition: any = { treasury: { id: treasuryId } };
  if (status) {
    whereCondition.status = status;
  }
  
  return this.proposalRepository.find({
    where: whereCondition,
    relations: ['votes', 'treasury'],
    order: { createdAt: 'DESC' }
  });
}

async getTreasuryMetrics(treasuryId: string): Promise<any> {
  const treasury = await this.getTreasury(treasuryId);
  
  const [
    totalProposals,
    activeProposals,
    executedProposals,
    totalVotes,
    avgVotingParticipation,
    monthlyTransactionVolume
  ] = await Promise.all([
    this.proposalRepository.count({ where: { treasury: { id: treasuryId } } }),
    this.proposalRepository.count({ 
      where: { treasury: { id: treasuryId }, status: ProposalStatus.ACTIVE } 
    }),
    this.proposalRepository.count({ 
      where: { treasury: { id: treasuryId }, status: ProposalStatus.EXECUTED } 
    }),
    this.voteRepository.count({ 
      where: { proposal: { treasury: { id: treasuryId } } } 
    }),
    this.calculateAverageVotingParticipation(treasuryId),
    this.calculateMonthlyVolume(treasuryId)
  ]);
  
  return {
    treasury: {
      id: treasury.id,
      name: treasury.name,
      totalValue: treasury.totalValue,
      multiSigAddress: treasury.multiSigAddress,
      signatoriesCount: treasury.signatories.length,
      requiredSignatures: treasury.requiredSignatures
    },
    governance: {
      totalProposals,
      activeProposals,
      executedProposals,
      totalVotes,
      avgVotingParticipation,
      executionRate: totalProposals > 0 ? (executedProposals / totalProposals) * 100 : 0
    },
    financial: {
      monthlyTransactionVolume,
      balanceDistribution: treasury.balances.map(b => ({
        token: b.tokenSymbol,
        balance: b.balance,
        usdValue: b.usdValue,
        percentage: (b.usdValue / treasury.totalValue) * 100
      }))
    }
  };
}

private async calculateAverageVotingParticipation(treasuryId: string): Promise<number> {
  const proposals = await this.proposalRepository.find({
    where: { treasury: { id: treasuryId }, status: ProposalStatus.EXECUTED },
    relations: ['votes']
  });
  
  if (proposals.length === 0) return 0;
  
  const totalParticipation = proposals.reduce((sum, proposal) => {
    return sum + proposal.votes.length;
  }, 0);
  
  return totalParticipation / proposals.length;
}

private async calculateMonthlyVolume(treasuryId: string): Promise<number> {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  
  const result = await this.transactionRepository
    .createQueryBuilder('tx')
    .select('SUM(tx.usdValue)', 'volume')
    .where('tx.treasuryId = :treasuryId', { treasuryId })
    .andWhere('tx.timestamp >= :date', { date: oneMonthAgo })
    .getRawOne();
  
  return result?.volume || 0;
}