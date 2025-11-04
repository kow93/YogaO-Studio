export enum PassType {
    ONE_DAY = '원데이 (1일)',
    ONE_WEEK = '1주일',
    MONTHLY_2_PER_WEEK = '주 2회 / 1개월',
    QUARTERLY_2_PER_WEEK = '주 2회 / 3개월',
    MONTHLY_3_PER_WEEK = '주 3회 / 1개월',
    QUARTERLY_3_PER_WEEK = '주 3회 / 3개월',
    MONTHLY_5_PER_WEEK = '주 5회 / 1개월',
    QUARTERLY_5_PER_WEEK = '주 5회 / 3개월',
}

export interface Student {
  id: string;
  name: string;
  phone: string;
  registrationDate: string; // ISO string
  remarks?: string;
}

export interface Membership {
  id:string;
  studentId: string;
  passType: PassType;
  startDate: string; // ISO string
  endDate: string; // ISO string
  price: number;
  holdStartDate?: string;
  holdEndDate?: string;
  paymentMethod: '카드' | '현금';
  cashReceiptIssued?: boolean;
}

export interface AttendanceRecord {
  studentId: string;
  date: string; // YYYY-MM-DD
  classTime: string;
}

export enum ExpenseCategory {
    FIXED_COST = '고정비',
    SUPPLIES = '비품',
    EVENT = '이벤트',
    ENTERTAINMENT = '접대비',
    MAINTENANCE = '유지보수비',
    OTHER = '기타',
}

export interface Expense {
    id: string;
    date: string; // YYYY-MM-DD
    category: ExpenseCategory;
    description: string;
    amount: number;
}


export type ViewType = 'dashboard' | 'students' | 'attendance' | 'expenses';