
export enum PassType {
    ONE_DAY = '원데이 (1일)',
    ONE_WEEK = '1주일',
    MONTHLY_2_PER_WEEK = '주 2회 / 1개월',
    QUARTERLY_2_PER_WEEK = '주 2회 / 3개월',
    HALF_YEARLY_2_PER_WEEK = '주 2회 / 6개월',
    MONTHLY_3_PER_WEEK = '주 3회 / 1개월',
    QUARTERLY_3_PER_WEEK = '주 3회 / 3개월',
    HALF_YEARLY_3_PER_WEEK = '주 3회 / 6개월',
    MONTHLY_5_PER_WEEK = '주 5회 / 1개월',
    QUARTERLY_5_PER_WEEK = '주 5회 / 3개월',
    HALF_YEARLY_5_PER_WEEK = '주 5회 / 6개월',
}

export interface Student {
  id: string;
  name: string;
  phone: string;
  registrationDate: string; // ISO string
  remarks?: string;
  memo?: string;
}

export interface Membership {
  id:string;
  studentId: string;
  passType: PassType;
  startDate: string; // ISO string
  endDate: string; // ISO string
  price: number;
  discountAmount?: number;
  refundAmount?: number;
  paymentDate?: string; // ISO string
  holdStartDate?: string;
  holdEndDate?: string;
  paymentMethod: '카드' | '현금';
  cashReceiptIssued?: boolean;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName?: string;
  studentPhone?: string;
  classId?: string;
  date: string; // YYYY-MM-DD
  classTime: string; // "HH:mm - ClassName"
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

export interface ClassSchedule {
    id: string;
    dayOfWeek: number; // 1 for Mon, 2 for Tue, ... 6 for Sat
    startTime: string; // "HH:mm"
    endTime: string; // "HH:mm"
    className: string;
    color: string;
}


export type ViewType = 'dashboard' | 'active_members' | 'memberships' | 'schedule' | 'expenses';