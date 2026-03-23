import React, { useMemo, useState, useCallback } from 'react';
import { Transaction, Student, Membership, Expense } from '../types';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { TrendingUp, TrendingDown, Wallet, Calendar, ChevronLeft, ChevronRight, PieChart as PieChartIcon, Printer, Download, ArrowUpRight, ArrowDownRight, BarChart3 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';

dayjs.extend(utc);
dayjs.extend(timezone);

interface FinancialReportProps {
    transactions: Transaction[];
    students: Student[];
    memberships: Membership[];
    expenses: Expense[];
}

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
};

export const FinancialReport: React.FC<FinancialReportProps> = ({ transactions, students, memberships, expenses }) => {
    const now = dayjs().tz('Asia/Seoul');
    const [selectedYear, setSelectedYear] = useState(now.year());
    const [selectedMonth, setSelectedMonth] = useState(now.month() + 1); // 1-12

    const selectedDate = useMemo(() => dayjs().tz('Asia/Seoul').year(selectedYear).month(selectedMonth - 1), [selectedYear, selectedMonth]);

    // Income from memberships based on payment_date
    const filteredIncome = useMemo(() => {
        return memberships.filter(m => {
            if (!m.paymentDate) return false;
            const pDate = dayjs(m.paymentDate).tz('Asia/Seoul');
            return pDate.year() === selectedYear && (pDate.month() + 1) === selectedMonth;
        }).map(m => {
            // Determine New vs Renewal
            const prevPayments = memberships.filter(prev => 
                prev.studentId === m.studentId && 
                prev.id !== m.id &&
                prev.paymentDate && 
                dayjs(prev.paymentDate).tz('Asia/Seoul').isBefore(dayjs(m.paymentDate).tz('Asia/Seoul'))
            );
            return {
                ...m,
                registrationType: prevPayments.length > 0 ? 'Renewal' : 'New'
            };
        });
    }, [memberships, selectedYear, selectedMonth]);

    // Expenses from expenses table
    const filteredExpenses = useMemo(() => {
        return expenses.filter(e => {
            const eDate = dayjs(e.date).tz('Asia/Seoul');
            return eDate.year() === selectedYear && (eDate.month() + 1) === selectedMonth;
        });
    }, [expenses, selectedYear, selectedMonth]);

    const prevMonthIncome = useMemo(() => {
        const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
        const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
        return memberships.filter(m => {
            if (!m.paymentDate) return false;
            const pDate = dayjs(m.paymentDate).tz('Asia/Seoul');
            return pDate.year() === prevYear && (pDate.month() + 1) === prevMonth;
        });
    }, [memberships, selectedYear, selectedMonth]);

    const prevMonthExpenses = useMemo(() => {
        const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
        const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
        return expenses.filter(e => {
            const eDate = dayjs(e.date).tz('Asia/Seoul');
            return eDate.year() === prevYear && (eDate.month() + 1) === prevMonth;
        });
    }, [expenses, selectedYear, selectedMonth]);

    const stats = useMemo(() => {
        const income = filteredIncome.reduce((sum, m) => sum + (m.price || 0) - (m.refundAmount || 0), 0);
        const expense = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

        const prevIncome = prevMonthIncome.reduce((sum, m) => sum + (m.price || 0) - (m.refundAmount || 0), 0);
        const prevExpense = prevMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

        const incomeDiff = prevIncome === 0 ? 0 : ((income - prevIncome) / prevIncome) * 100;
        const expenseDiff = prevExpense === 0 ? 0 : ((expense - prevExpense) / prevExpense) * 100;

        return {
            income,
            expense,
            profit: income - expense,
            incomeDiff,
            expenseDiff
        };
    }, [filteredIncome, filteredExpenses, prevMonthIncome, prevMonthExpenses]);

    // Daily Breakdown for the selected month
    const dailyBreakdownData = useMemo(() => {
        const daysInMonth = selectedDate.daysInMonth();
        const data = [];
        for (let i = 1; i <= daysInMonth; i++) {
            const dayIncome = filteredIncome.filter(m => dayjs(m.paymentDate).tz('Asia/Seoul').date() === i)
                .reduce((sum, m) => sum + (m.price || 0) - (m.refundAmount || 0), 0);
            const dayExpense = filteredExpenses.filter(e => dayjs(e.date).tz('Asia/Seoul').date() === i)
                .reduce((sum, e) => sum + e.amount, 0);
            data.push({
                name: `${i}일`,
                매출: dayIncome,
                지출: dayExpense
            });
        }
        return data;
    }, [filteredIncome, filteredExpenses, selectedDate]);

    // New vs Renewal Pie Chart
    const registrationTypeData = useMemo(() => {
        const counts = { New: 0, Renewal: 0 };
        filteredIncome.forEach(m => {
            counts[m.registrationType as 'New' | 'Renewal'] += 1;
        });
        return [
            { name: '신규 (New)', value: counts.New },
            { name: '재등록 (Renewal)', value: counts.Renewal }
        ].filter(d => d.value > 0);
    }, [filteredIncome]);

    // Last 6 months trend
    const getMonthMetrics = useCallback((month: number, year: number) => {
        const monthIncome = memberships.filter(m => {
            if (!m.paymentDate) return false;
            const d = dayjs(m.paymentDate).tz('Asia/Seoul');
            return d.month() === month && d.year() === year;
        }).reduce((acc, m) => acc + (m.price || 0) - (m.refundAmount || 0), 0);

        const monthExpense = expenses.filter(e => {
            const d = dayjs(e.date).tz('Asia/Seoul');
            return d.month() === month && d.year() === year;
        }).reduce((acc, e) => acc + e.amount, 0);
        
        return { revenue: monthIncome, expense: monthExpense, profit: monthIncome - monthExpense };
    }, [memberships, expenses]);

    const trendData = useMemo(() => {
        const data = [];
        for (let i = 5; i >= 0; i--) {
            const d = selectedDate.subtract(i, 'month');
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
    }, [getMonthMetrics, selectedDate]);

    const categoryBreakdown = useMemo(() => {
        const breakdown: Record<string, { income: number; expense: number }> = {};
        
        filteredIncome.forEach(m => {
            const cat = '멤버십';
            if (!breakdown[cat]) breakdown[cat] = { income: 0, expense: 0 };
            breakdown[cat].income += (m.price || 0) - (m.refundAmount || 0);
        });

        filteredExpenses.forEach(e => {
            if (!breakdown[e.category]) breakdown[e.category] = { income: 0, expense: 0 };
            breakdown[e.category].expense += e.amount;
        });

        return Object.entries(breakdown)
            .map(([name, values]) => ({
                name,
                ...values,
                total: values.income + values.expense
            }))
            .sort((a, b) => b.total - a.total);
    }, [filteredIncome, filteredExpenses]);

    const sortedTransactions = useMemo(() => {
        const incomeItems = filteredIncome.map(m => ({
            id: m.id,
            date: m.paymentDate!,
            type: 'Income' as const,
            category: '멤버십',
            amount: (m.price || 0) - (m.refundAmount || 0),
            studentId: m.studentId,
            description: `${m.passType} 결제`,
            registrationType: m.registrationType
        }));

        const expenseItems = filteredExpenses.map(e => ({
            id: e.id,
            date: e.date,
            type: 'Expense' as const,
            category: e.category,
            amount: e.amount,
            studentId: undefined,
            description: e.description,
            registrationType: undefined
        }));

        return [...incomeItems, ...expenseItems].sort((a, b) => dayjs(b.date).diff(dayjs(a.date)));
    }, [filteredIncome, filteredExpenses]);

    const getStudentName = (studentId?: string) => {
        if (!studentId) return '-';
        return students.find(s => s.id === studentId)?.name || '알 수 없는 학생';
    };

    const handlePrevMonth = () => {
        if (selectedMonth === 1) {
            setSelectedYear(prev => prev - 1);
            setSelectedMonth(12);
        } else {
            setSelectedMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (selectedMonth === 12) {
            setSelectedYear(prev => prev + 1);
            setSelectedMonth(1);
        } else {
            setSelectedMonth(prev => prev + 1);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportCSV = () => {
        if (sortedTransactions.length === 0) return;
        
        const headers = ['날짜', '구분', '카테고리', '금액', '학생/내용'];
        const rows = sortedTransactions.map(t => [
            dayjs(t.date).tz('Asia/Seoul').format('YYYY-MM-DD HH:mm'),
            t.type,
            t.category,
            t.amount,
            `${getStudentName(t.studentId)} ${t.description || ''}`.trim()
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `financial_report_${selectedYear}_${selectedMonth}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const yearlyStats = useMemo(() => {
        const yearIncome = memberships.filter(m => {
            if (!m.paymentDate) return false;
            return dayjs(m.paymentDate).tz('Asia/Seoul').year() === selectedYear;
        }).reduce((sum, m) => sum + (m.price || 0) - (m.refundAmount || 0), 0);

        const yearExpense = expenses.filter(e => {
            return dayjs(e.date).tz('Asia/Seoul').year() === selectedYear;
        }).reduce((sum, e) => sum + e.amount, 0);
        
        return {
            income: yearIncome,
            expense: yearExpense,
            profit: yearIncome - yearExpense
        };
    }, [memberships, expenses, selectedYear]);

    return (
        <div className="p-6 space-y-8 bg-[#F8F9FA] min-h-screen print:bg-white print:p-0">
            {/* Header with Month Selector */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div className="flex flex-col space-y-1">
                    <h1 className="text-3xl font-bold text-[#1A1A1A] tracking-tight">재무 리포트</h1>
                    <p className="text-[#666] text-sm">월별 및 연간 수익 및 지출 현황을 확인하세요.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white px-4 py-2 rounded-2xl shadow-sm border border-[#E5E7EB] space-x-4">
                        <button 
                            onClick={handlePrevMonth}
                            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-500" />
                        </button>
                        <div className="flex items-center space-x-2 font-bold text-gray-900 min-w-[120px] justify-center">
                            <Calendar className="w-4 h-4 text-indigo-500" />
                            <span>{selectedYear}년 {selectedMonth}월</span>
                        </div>
                        <button 
                            onClick={handleNextMonth}
                            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ChevronRight className="w-5 h-5 text-gray-500" />
                        </button>
                        <button 
                            onClick={() => {
                                setSelectedYear(now.year());
                                setSelectedMonth(now.month() + 1);
                            }}
                            className="text-xs font-bold text-indigo-600 hover:underline px-2"
                        >
                            이번 달
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleExportCSV}
                            className="p-2 bg-white border border-[#E5E7EB] rounded-xl shadow-sm hover:bg-gray-50 text-gray-600 transition-all"
                            title="CSV 내보내기"
                        >
                            <Download className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={handlePrint}
                            className="p-2 bg-white border border-[#E5E7EB] rounded-xl shadow-sm hover:bg-gray-50 text-gray-600 transition-all"
                            title="인쇄하기"
                        >
                            <Printer className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block mb-8 text-center">
                <h1 className="text-2xl font-bold">{selectedYear}년 {selectedMonth}월 재무 리포트</h1>
                <p className="text-sm text-gray-500">출력 일시: {dayjs().format('YYYY-MM-DD HH:mm')}</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E5E7EB] relative overflow-hidden group print:shadow-none print:border-gray-300">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform print:hidden">
                        <TrendingUp className="w-16 h-16 text-emerald-600" />
                    </div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">총 매출 (Income)</p>
                    <p className="text-3xl font-black text-emerald-600">
                        {stats.income.toLocaleString()}원
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center text-xs text-emerald-600 font-bold bg-emerald-50 w-fit px-2 py-1 rounded-lg print:bg-transparent print:border print:border-emerald-200">
                            <span>멤버십 & 업그레이드 포함</span>
                        </div>
                        {stats.incomeDiff !== 0 && (
                            <div className={`flex items-center gap-1 text-xs font-bold ${stats.incomeDiff > 0 ? 'text-emerald-600' : 'text-rose-600'} print:hidden`}>
                                {stats.incomeDiff > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {Math.abs(stats.incomeDiff).toFixed(1)}%
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E5E7EB] relative overflow-hidden group print:shadow-none print:border-gray-300">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform print:hidden">
                        <TrendingDown className="w-16 h-16 text-rose-600" />
                    </div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">총 지출 (Expense)</p>
                    <p className="text-3xl font-black text-rose-600">
                        {stats.expense.toLocaleString()}원
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center text-xs text-rose-600 font-bold bg-rose-50 w-fit px-2 py-1 rounded-lg print:bg-transparent print:border print:border-rose-200">
                            <span>환불 & 일반 지출 포함</span>
                        </div>
                        {stats.expenseDiff !== 0 && (
                            <div className={`flex items-center gap-1 text-xs font-bold ${stats.expenseDiff > 0 ? 'text-rose-600' : 'text-emerald-600'} print:hidden`}>
                                {stats.expenseDiff > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {Math.abs(stats.expenseDiff).toFixed(1)}%
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E5E7EB] relative overflow-hidden group print:shadow-none print:border-gray-300">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform print:hidden">
                        <Wallet className="w-16 h-16 text-indigo-600" />
                    </div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">순수익 (Net Profit)</p>
                    <p className={`text-3xl font-black ${stats.profit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                        {stats.profit.toLocaleString()}원
                    </p>
                    <div className={`mt-4 flex items-center text-xs font-bold w-fit px-2 py-1 rounded-lg print:bg-transparent print:border ${stats.profit >= 0 ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
                        <span>{stats.profit >= 0 ? '수익 발생' : '손실 발생'}</span>
                    </div>
                </div>
            </div>

            {/* Financial Trend Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 6 Months Trend */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E5E7EB]">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
                            최근 6개월 재무 흐름
                        </h3>
                        <div className="flex gap-4 text-[10px] font-bold">
                            <div className="flex items-center gap-1.5 text-indigo-600">
                                <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></span> 매출
                            </div>
                            <div className="flex items-center gap-1.5 text-rose-500">
                                <span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span> 지출
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

                {/* Daily Breakdown */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E5E7EB]">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                            {selectedMonth}월 일간 매출 현황
                        </h3>
                        <div className="flex gap-4 text-[10px] font-bold">
                            <div className="flex items-center gap-1.5 text-emerald-500">
                                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span> 매출
                            </div>
                            <div className="flex items-center gap-1.5 text-rose-500">
                                <span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span> 지출
                            </div>
                        </div>
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailyBreakdownData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 500 }}
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
                                <Bar dataKey="매출" fill="#10B981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="지출" fill="#EF4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Category Breakdown */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E5E7EB] print:shadow-none print:border-gray-300">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <PieChartIcon className="w-5 h-5 text-indigo-500" />
                                카테고리별 요약
                            </h2>
                        </div>
                        
                        {categoryBreakdown.length > 0 ? (
                            <div className="space-y-8">
                                <div className="h-[200px] w-full print:hidden">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={categoryBreakdown.map(cat => ({ name: cat.name, value: cat.total }))}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {categoryBreakdown.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                formatter={(value: number) => `${value.toLocaleString()}원`}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="space-y-6">
                                    {categoryBreakdown.map((cat, idx) => (
                                        <div key={idx} className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                                    <span className="font-bold text-gray-700">{cat.name}</span>
                                                </div>
                                                <span className="text-gray-500 font-medium">{cat.total.toLocaleString()}원</span>
                                            </div>
                                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                                                {cat.income > 0 && (
                                                    <div 
                                                        className="h-full bg-emerald-400" 
                                                        style={{ width: `${(cat.income / cat.total) * 100}%` }}
                                                    />
                                                )}
                                                {cat.expense > 0 && (
                                                    <div 
                                                        className="h-full bg-rose-400" 
                                                        style={{ width: `${(cat.expense / cat.total) * 100}%` }}
                                                    />
                                                )}
                                            </div>
                                            <div className="flex justify-between text-[10px] font-bold">
                                                <span className="text-emerald-600">수입: {cat.income.toLocaleString()}원</span>
                                                <span className="text-rose-600">지출: {cat.expense.toLocaleString()}원</span>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="pt-4 border-t border-gray-100">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-black text-gray-900">합계</span>
                                            <span className="text-lg font-black text-indigo-600">{(stats.income + stats.expense).toLocaleString()}원</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-12 text-center text-gray-400 text-sm italic">
                                데이터가 없습니다.
                            </div>
                        )}
                    </div>

                    {/* New vs Renewal Pie Chart */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E5E7EB]">
                        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-amber-500" />
                            신규 vs 재등록 비중
                        </h2>
                        {registrationTypeData.length > 0 ? (
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={registrationTypeData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={70}
                                            paddingAngle={5}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        >
                                            <Cell fill="#6366F1" />
                                            <Cell fill="#F59E0B" />
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="py-8 text-center text-gray-400 text-xs italic">
                                이번 달 멤버십 결제 데이터가 없습니다.
                            </div>
                        )}
                    </div>
                </div>

                {/* Transaction History */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Yearly Overview */}
                    <div className="bg-indigo-600 p-6 rounded-3xl shadow-lg text-white relative overflow-hidden print:bg-white print:text-gray-900 print:border print:border-gray-300 print:shadow-none">
                        <div className="absolute top-0 right-0 p-4 opacity-20 print:hidden">
                            <Calendar className="w-20 h-20" />
                        </div>
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            {selectedYear}년 누적 현황
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                            <div className="space-y-1">
                                <span className="text-xs opacity-80">총 매출</span>
                                <p className="text-2xl font-black">{yearlyStats.income.toLocaleString()}원</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs opacity-80">총 지출</span>
                                <p className="text-2xl font-black">{yearlyStats.expense.toLocaleString()}원</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs opacity-80">누적 순수익</span>
                                <p className="text-2xl font-black">{yearlyStats.profit.toLocaleString()}원</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm border border-[#E5E7EB] overflow-hidden print:shadow-none print:border-gray-300">
                        <div className="p-6 border-b border-[#E5E7EB] flex justify-between items-center bg-white">
                            <h2 className="text-lg font-bold text-[#1A1A1A]">상세 거래 내역</h2>
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full print:border print:border-gray-300">
                                총 {sortedTransactions.length}건
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">날짜</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">구분</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">카테고리</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">금액</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">학생/내용</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E5E7EB]">
                                    {sortedTransactions.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic text-sm">
                                                이 기간의 거래 내역이 없습니다.
                                            </td>
                                        </tr>
                                    )}
                                    {sortedTransactions.map((t) => (
                                        <tr key={t.id} className="hover:bg-[#F9FAFB] transition-colors group print:hover:bg-transparent">
                                            <td className="px-6 py-4">
                                                <div className="text-xs font-bold text-gray-400 mb-1">
                                                    {dayjs(t.date).tz('Asia/Seoul').format('MM/DD')}
                                                </div>
                                                <div className="text-[10px] text-gray-400">
                                                    {dayjs(t.date).tz('Asia/Seoul').format('HH:mm')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter w-fit ${
                                                        t.type === 'Income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                                    } print:bg-transparent print:border ${t.type === 'Income' ? 'print:border-emerald-200' : 'print:border-rose-200'}`}>
                                                        {t.type === 'Income' ? 'Income' : 'Expense'}
                                                    </span>
                                                    {t.registrationType && (
                                                        <span className={`text-[9px] font-bold ${t.registrationType === 'New' ? 'text-indigo-600' : 'text-amber-600'}`}>
                                                            {t.registrationType === 'New' ? '신규' : '재등록'}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-bold text-gray-700">{t.category}</div>
                                            </td>
                                            <td className={`px-6 py-4 text-sm font-black ${
                                                t.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'
                                            }`}>
                                                {t.type === 'Income' ? '+' : '-'}{t.amount.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-gray-900">{getStudentName(t.studentId)}</span>
                                                    <span className="text-[10px] text-gray-400 truncate max-w-[150px]">{t.description || '-'}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

