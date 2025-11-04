import { PassType, ExpenseCategory } from './types';

export const PASS_OPTIONS: { label: PassType; value: PassType }[] = [
    { label: PassType.ONE_DAY, value: PassType.ONE_DAY },
    { label: PassType.ONE_WEEK, value: PassType.ONE_WEEK },
    { label: PassType.MONTHLY_2_PER_WEEK, value: PassType.MONTHLY_2_PER_WEEK },
    { label: PassType.QUARTERLY_2_PER_WEEK, value: PassType.QUARTERLY_2_PER_WEEK },
    { label: PassType.MONTHLY_3_PER_WEEK, value: PassType.MONTHLY_3_PER_WEEK },
    { label: PassType.QUARTERLY_3_PER_WEEK, value: PassType.QUARTERLY_3_PER_WEEK },
    { label: PassType.MONTHLY_5_PER_WEEK, value: PassType.MONTHLY_5_PER_WEEK },
    { label: PassType.QUARTERLY_5_PER_WEEK, value: PassType.QUARTERLY_5_PER_WEEK },
];

export const PASS_PRICES: Record<PassType, number> = {
    [PassType.ONE_DAY]: 30000,
    [PassType.ONE_WEEK]: 50000,
    [PassType.MONTHLY_2_PER_WEEK]: 150000,
    [PassType.QUARTERLY_2_PER_WEEK]: 360000,
    [PassType.MONTHLY_3_PER_WEEK]: 170000,
    [PassType.QUARTERLY_3_PER_WEEK]: 390000,
    [PassType.MONTHLY_5_PER_WEEK]: 200000,
    [PassType.QUARTERLY_5_PER_WEEK]: 480000,
};

export const PASS_DURATIONS_DAYS: Record<PassType, number> = {
    [PassType.ONE_DAY]: 1,
    [PassType.ONE_WEEK]: 7,
    [PassType.MONTHLY_2_PER_WEEK]: 30,
    [PassType.QUARTERLY_2_PER_WEEK]: 90,
    [PassType.MONTHLY_3_PER_WEEK]: 30,
    [PassType.QUARTERLY_3_PER_WEEK]: 90,
    [PassType.MONTHLY_5_PER_WEEK]: 30,
    [PassType.QUARTERLY_5_PER_WEEK]: 90,
};

export const CLASS_TIMES = ['10:10 - 11:10', '18:10 - 19:10', '19:40 - 20:40'];

export const EXPENSE_CATEGORIES_OPTIONS: { label: ExpenseCategory, value: ExpenseCategory }[] = [
    { label: ExpenseCategory.FIXED_COST, value: ExpenseCategory.FIXED_COST },
    { label: ExpenseCategory.SUPPLIES, value: ExpenseCategory.SUPPLIES },
    { label: ExpenseCategory.EVENT, value: ExpenseCategory.EVENT },
    { label: ExpenseCategory.ENTERTAINMENT, value: ExpenseCategory.ENTERTAINMENT },
    { label: ExpenseCategory.MAINTENANCE, value: ExpenseCategory.MAINTENANCE },
    { label: ExpenseCategory.OTHER, value: ExpenseCategory.OTHER },
];