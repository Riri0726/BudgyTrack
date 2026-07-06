/**
 * Utility functions for budget and wallet calculations.
 */

/**
 * Calculates spent, income, and balance stats for a specific wallet or account.
 * @param {Array} transactions - List of transactions
 * @param {string} walletId - ID of the target wallet
 * @returns {Object} { spent, income, balance }
 */
export function getWalletStats(transactions, walletId) {
  const wTxs = transactions.filter(t => t.account_id === walletId);
  const spent = wTxs
    .filter(t => t.type === 'expense' && t.status === 'confirmed')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const income = wTxs
    .filter(t => t.type === 'income' && t.status === 'confirmed')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const balance = income - spent;
  return { spent, income, balance };
}

/**
 * Calculates overall spent, income, and total balance across all transactions.
 * @param {Array} transactions - List of transactions
 * @returns {Object} { overallSpent, overallIncome, totalBalance }
 */
export function getOverallStats(transactions) {
  const overallSpent = transactions
    .filter(t => t.type === 'expense' && t.status === 'confirmed')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const overallIncome = transactions
    .filter(t => t.type === 'income' && t.status === 'confirmed')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const totalBalance = overallIncome - overallSpent;
  return { overallSpent, overallIncome, totalBalance };
}

/**
 * Calculates budget spent amounts mapped by category.
 * @param {Array} categories - Expense categories
 * @param {Array} transactions - Expense transactions
 * @returns {Array} Mapped categories with dynamic 'spent' property
 */
export function getCategoryBudgetDetails(categories, transactions) {
  return categories.map(cat => {
    const totalSpent = transactions
      .filter(t => t.category_id === cat.id && t.type === 'expense' && t.status === 'confirmed')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    return {
      ...cat,
      spent: totalSpent
    };
  });
}
