import { prisma } from '../src/config/prisma.js';
import { expenseCategoriesService } from '../src/modules/finance/expense-categories/expenseCategories.service.js';
import { headsService } from '../src/modules/finance/heads/heads.service.js';

const tenant = await prisma.tenant.findFirst({
  where: { status: 'active' },
  select: { id: true, branches: { where: { status: 'active' }, take: 1, select: { id: true } } },
});
if (!tenant?.branches?.length) throw new Error('No active tenant/branch available for isolated test');

const tenantId = tenant.id;
const branchId = tenant.branches[0].id;
const branchScope = { branchId, resolvedBranchId: branchId, requestedBranchId: branchId, isBranchScoped: true };
const suffix = `codex_${Date.now()}`;
const ids = { categories: [], heads: [] };

const expect409 = async (promise, label) => {
  try {
    await promise;
    throw new Error(`${label}: active duplicate was accepted`);
  } catch (error) {
    if (error.statusCode !== 409 && error.status !== 409) throw error;
  }
};

try {
  const category = await expenseCategoriesService.createCategory(tenantId, { name: `cat_${suffix}` }, branchScope);
  ids.categories.push(category.id);
  await expect409(expenseCategoriesService.createCategory(tenantId, { name: `cat_${suffix}` }, branchScope), 'expense category');
  await expenseCategoriesService.deactivateCategory(tenantId, category.id, branchScope);
  const restoredCategory = await expenseCategoriesService.createCategory(tenantId, { name: `cat_${suffix}` }, branchScope);
  if (restoredCategory.id !== category.id || restoredCategory.status !== 'active') throw new Error('expense category was not restored');
  console.log('PASS expense category: create -> duplicate blocked -> delete -> re-create');

  const income = await headsService.createHead(tenantId, { branchId, name: `income_${suffix}`, type: 'income' }, branchScope);
  ids.heads.push(income.id);
  await expect409(headsService.createHead(tenantId, { branchId, name: `income_${suffix}`, type: 'income' }, branchScope), 'income head');
  await headsService.deactivateHead(tenantId, income.id, branchScope);
  const restoredIncome = await headsService.createHead(tenantId, { branchId, name: `income_${suffix}`, type: 'income' }, branchScope);
  if (restoredIncome.id !== income.id || restoredIncome.status !== 'active') throw new Error('income head was not restored');
  console.log('PASS income: create -> duplicate blocked -> delete -> re-create');

  const expense = await headsService.createHead(tenantId, { branchId, name: `expense_${suffix}`, type: 'expense', expenseCategoryId: category.id }, branchScope);
  ids.heads.push(expense.id);
  await expect409(headsService.createHead(tenantId, { branchId, name: `expense_${suffix}`, type: 'expense', expenseCategoryId: category.id }, branchScope), 'expense head');
  await headsService.deactivateHead(tenantId, expense.id, branchScope);
  const restoredExpense = await headsService.createHead(tenantId, { branchId, name: `expense_${suffix}`, type: 'expense', expenseCategoryId: category.id }, branchScope);
  if (restoredExpense.id !== expense.id || restoredExpense.status !== 'active') throw new Error('expense head was not restored');
  console.log('PASS expense: create -> duplicate blocked -> delete -> re-create');
} finally {
  if (ids.heads.length) await prisma.financeHead.deleteMany({ where: { id: { in: ids.heads } } });
  if (ids.categories.length) await prisma.financeExpenseCategory.deleteMany({ where: { id: { in: ids.categories } } });
  await prisma.$disconnect();
}
