import { describe, it, expect } from 'vitest';
import { getWalletStats, getOverallStats, getCategoryBudgetDetails } from '../utils/calculations';

describe('Financial Calculations Helper Tests', () => {
  const mockTransactions = [
    { id: '1', account_id: 'wallet-a', category_id: 'cat-1', type: 'income', amount: '1000.00', status: 'confirmed' },
    { id: '2', account_id: 'wallet-a', category_id: 'cat-2', type: 'expense', amount: '250.00', status: 'confirmed' },
    { id: '3', account_id: 'wallet-a', category_id: 'cat-3', type: 'expense', amount: '100.00', status: 'planned' }, // should be ignored (not confirmed)
    { id: '4', account_id: 'wallet-b', category_id: 'cat-1', type: 'income', amount: '500.00', status: 'confirmed' },
    { id: '5', account_id: 'wallet-b', category_id: 'cat-2', type: 'expense', amount: '150.00', status: 'confirmed' },
  ];

  it('calculates stats for a single wallet correctly', () => {
    const walletAStats = getWalletStats(mockTransactions, 'wallet-a');
    expect(walletAStats.income).toBe(1000.00);
    expect(walletAStats.spent).toBe(250.00);
    expect(walletAStats.balance).toBe(750.00);

    const walletBStats = getWalletStats(mockTransactions, 'wallet-b');
    expect(walletBStats.income).toBe(500.00);
    expect(walletBStats.spent).toBe(150.00);
    expect(walletBStats.balance).toBe(350.00);
  });

  it('calculates overall stats across all wallets correctly', () => {
    const overall = getOverallStats(mockTransactions);
    expect(overall.overallIncome).toBe(1500.00);
    expect(overall.overallSpent).toBe(400.00);
    expect(overall.totalBalance).toBe(1100.00);
  });

  it('calculates category budget details correctly', () => {
    const mockCategories = [
      { id: 'cat-2', name: 'Food', budget: 500.00 },
      { id: 'cat-4', name: 'Utilities', budget: 1000.00 }
    ];

    const categoryBudgets = getCategoryBudgetDetails(mockCategories, mockTransactions);
    
    const foodCat = categoryBudgets.find(c => c.id === 'cat-2');
    expect(foodCat.spent).toBe(400.00); // 250 + 150

    const utilCat = categoryBudgets.find(c => c.id === 'cat-4');
    expect(utilCat.spent).toBe(0);
  });
});
