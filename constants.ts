import { PassType, ExpenseCategory, ClassSchedule } from './types';

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

export const DEFAULT_SCHEDULE: ClassSchedule[] = [
    // 10:10 AM Classes
    { id: 'cls-1', dayOfWeek: 1, startTime: '10:10', endTime: '11:10', className: '고요한 요가', color: 'blue' },
    { id: 'cls-2', dayOfWeek: 2, startTime: '10:10', endTime: '11:10', className: '활기찬 요가', color: 'green' },
    { id: 'cls-3', dayOfWeek: 3, startTime: '10:10', endTime: '11:10', className: '강인한 요가', color: 'amber' },
    { id: 'cls-4', dayOfWeek: 4, startTime: '10:10', endTime: '11:10', className: '활기찬 요가', color: 'green' },
    { id: 'cls-5', dayOfWeek: 5, startTime: '10:10', endTime: '11:10', className: '고요한 요가', color: 'blue' },

    // 18:10 PM Classes
    { id: 'cls-6', dayOfWeek: 1, startTime: '18:10', endTime: '19:10', className: '고요한 요가', color: 'blue' },
    { id: 'cls-7', dayOfWeek: 2, startTime: '18:10', endTime: '19:10', className: '활기찬 요가', color: 'green' },
    { id: 'cls-8', dayOfWeek: 3, startTime: '18:10', endTime: '19:10', className: '강인한 요가', color: 'amber' },
    { id: 'cls-9', dayOfWeek: 4, startTime: '18:10', endTime: '19:10', className: '활기찬 요가', color: 'green' },
    { id: 'cls-10', dayOfWeek: 5, startTime: '18:10', endTime: '19:10', className: '고요한 요가', color: 'blue' },

    // 19:40 PM Classes
    { id: 'cls-11', dayOfWeek: 1, startTime: '19:40', endTime: '20:40', className: '고요한 요가', color: 'blue' },
    { id: 'cls-12', dayOfWeek: 2, startTime: '19:40', endTime: '20:40', className: '활기찬 요가', color: 'green' },
    { id: 'cls-13', dayOfWeek: 3, startTime: '19:40', endTime: '20:40', className: '강인한 요가', color: 'amber' },
    { id: 'cls-14', dayOfWeek: 4, startTime: '19:40', endTime: '20:40', className: '활기찬 요가', color: 'green' },
    { id: 'cls-15', dayOfWeek: 5, startTime: '19:40', endTime: '20:40', className: '고요한 요가', color: 'blue' },
];

export const CLASS_COLORS: { [key: string]: { name: string; classes: string } } = {
    blue: { name: 'Blue', classes: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200' },
    green: { name: 'Green', classes: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200' },
    amber: { name: 'Amber', classes: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200' },
    red: { name: 'Red', classes: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200' },
    purple: { name: 'Purple', classes: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200' },
    pink: { name: 'Pink', classes: 'bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200' },
};
