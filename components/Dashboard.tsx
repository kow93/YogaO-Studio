
import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { Student, Membership, Expense, AttendanceRecord, ClassSchedule } from '../types';

interface DashboardProps {
    students: Student[];
    memberships: Membership[];
    expenses: Expense[];
    attendance: AttendanceRecord[];
    schedule: ClassSchedule[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
};

const MetricCard: React.FC<{ 
    title: string; 
    value: string | number; 
    change?: number; 
    isCurrency?: boolean;
    icon?: string;
}> = ({ title, value, change, isCurrency, icon }) => {
    const isPositive = change !== undefined && change >= 0;
    const displayValue = isCurrency ? formatCurrency(Number(value)) : value;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
                    <h3 className="text-2xl font-bold text-gray-900">{displayValue}</h3>
                </div>
                <div className="p-2 bg-gray-50 rounded-lg text-xl">{icon}</div>
            </div>
            {change !== undefined && (
                <div className="mt-4 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${isPositive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                        {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">전월 대비</span>
                </div>
            )}
        </div>
    );
};

export const Dashboard: React.FC<DashboardProps> = ({ students, memberships, expenses, attendance, schedule }) => {
    const today = dayjs().utcOffset(9);
    const currentMonth = today.month();
    const currentYear = today.year();

    const lastMonthDate = today.subtract(1, 'month');
    const lastMonth = lastMonthDate.month();
    const lastMonthYear = lastMonthDate.year();

    // Helper to get metrics for a specific month
    const getMonthMetrics = (month: number, year: number) => {
        const monthMemberships = memberships.filter(m => {
            const d = dayjs(m.paymentDate || m.startDate);
            return d.month() === month && d.year() === year;
        });
        const monthExpenses = expenses.filter(e => {
            const d = dayjs(e.date);
            return d.month() === month && d.year() === year;
        });

        const revenue = monthMemberships.reduce((acc, m) => acc + (m.price || 0) - (m.refundAmount || 0), 0);
        const expense = monthExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
        
        return { revenue, expense, profit: revenue - expense };
    };

    const currentMetrics = getMonthMetrics(currentMonth, currentYear);
    const lastMetrics = getMonthMetrics(lastMonth, lastMonthYear);

    const calculateChange = (current: number, last: number) => {
        if (last === 0) return current > 0 ? 100 : 0;
        return ((current - last) / last) * 100;
    };

    const activeMembersCount = useMemo(() => {
        const t = dayjs().utcOffset(9).startOf('day');
        return memberships.filter(m => {
            if (!m.endDate) return false;
            const end = dayjs(m.endDate).startOf('day');
            return (end.isAfter(t) || end.isSame(t)) && !m.refundAmount;
        }).length;
    }, [memberships]);

    // Last 6 months trend
    const trendData = useMemo(() => {
        const data = [];
        for (let i = 5; i >= 0; i--) {
            const d = today.subtract(i, 'month');
            const m = d.month();
            const y = d.year();
            const metrics = getMonthMetrics(m, y);
            data.push({
                name: `${m + 1}월`,
                매출: metrics.revenue,
                지출: metrics.expense,
                순수익: metrics.profit
            });
        }
        return data;
    }, [memberships, expenses, today]);

    // Membership distribution
    const pieData = useMemo(() => {
        const counts: { [key: string]: number } = {};
        memberships.filter(m => !m.refundAmount).forEach(m => {
            counts[m.passType] = (counts[m.passType] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [memberships]);

    return (
        <div className="space-y-8 pb-12">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">비즈니스 대시보드</h2>
                    <p className="text-gray-500 mt-1">스튜디오 운영 현황 및 재무 지표 분석</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Last Updated</p>
                    <p className="text-sm font-medium text-gray-900">{today.format('YYYY-MM-DD HH:mm:ss')}</p>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard 
                    title="이번 달 총 매출" 
                    value={currentMetrics.revenue} 
                    change={calculateChange(currentMetrics.revenue, lastMetrics.revenue)}
                    isCurrency 
                    icon="💰"
                />
                <MetricCard 
                    title="이번 달 총 지출" 
                    value={currentMetrics.expense} 
                    change={calculateChange(currentMetrics.expense, lastMetrics.expense)}
                    isCurrency 
                    icon="💸"
                />
                <MetricCard 
                    title="이번 달 순수익" 
                    value={currentMetrics.profit} 
                    change={calculateChange(currentMetrics.profit, lastMetrics.profit)}
                    isCurrency 
                    icon="📈"
                />
                <MetricCard 
                    title="실시간 유효 회원수" 
                    value={activeMembersCount} 
                    icon="👥"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Revenue Trend Chart */}
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
                            최근 6개월 재무 흐름
                        </h3>
                        <div className="flex gap-4 text-xs font-bold">
                            <div className="flex items-center gap-1.5 text-indigo-600">
                                <span className="w-3 h-3 bg-indigo-600 rounded-full"></span> 매출
                            </div>
                            <div className="flex items-center gap-1.5 text-rose-500">
                                <span className="w-3 h-3 bg-rose-500 rounded-full"></span> 지출
                            </div>
                        </div>
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 500 }}
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 500 }}
                                    tickFormatter={(val) => `${val / 10000}만`}
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    formatter={(val: number) => formatCurrency(val)}
                                />
                                <Line type="monotone" dataKey="매출" stroke="#6366f1" strokeWidth={4} dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                                <Line type="monotone" dataKey="지출" stroke="#ef4444" strokeWidth={4} dot={{ r: 6, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Membership Distribution */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-8 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                        이용권 분포 현황
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-6 space-y-2">
                        {pieData.slice(0, 4).map((item, index) => (
                            <div key={item.name} className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                    <span className="text-xs text-gray-600 font-medium truncate max-w-[120px]">{item.name}</span>
                                </div>
                                <span className="text-xs font-bold text-gray-900">{item.value}명</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
