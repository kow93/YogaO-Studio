import React, { useMemo, useState } from 'react';
import { Transaction, Student } from '../types';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { TrendingUp, TrendingDown, Wallet, Calendar, ChevronLeft, ChevronRight, PieChart as PieChartIcon, Printer, Download, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

dayjs.extend(utc);
dayjs.extend(timezone);

interface FinancialReportProps {
    transactions: Transaction[];
    students: Student[];
}

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export const FinancialReport: React.FC<FinancialReportProps> = ({ transactions, students }) => {
    const now = dayjs().tz('Asia/Seoul');
    const [selectedYear, setSelectedYear] = useState(now.year());
    const [selectedMonth, setSelectedMonth] = useState(now.month() + 1); // 1-12

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const tDate = dayjs(t.date).tz('Asia/Seoul');
            return tDate.year() === selectedYear && (tDate.month() + 1) === selectedMonth;
        });
    }, [transactions, selectedYear, selectedMonth]);

    const prevMonthTransactions = useMemo(() => {
        const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
        const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
        return transactions.filter(t => {
            const tDate = dayjs(t.date).tz('Asia/Seoul');
            return tDate.year() === prevYear && (tDate.month() + 1) === prevMonth;
        });
    }, [transactions, selectedYear, selectedMonth]);

    const stats = useMemo(() => {
        const income = filteredTransactions
            .filter(t => t.type === 'Income')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const expense = filteredTransactions
            .filter(t => t.type === 'Expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const prevIncome = prevMonthTransactions
            .filter(t => t.type === 'Income')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const prevExpense = prevMonthTransactions
            .filter(t => t.type === 'Expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const incomeDiff = prevIncome === 0 ? 0 : ((income - prevIncome) / prevIncome) * 100;
        const expenseDiff = prevExpense === 0 ? 0 : ((expense - prevExpense) / prevExpense) * 100;

        return {
            income,
            expense,
            profit: income - expense,
            incomeDiff,
            expenseDiff
        };
    }, [filteredTransactions, prevMonthTransactions]);

    const categoryBreakdown = useMemo(() => {
        const breakdown: Record<string, { income: number; expense: number }> = {};
        
        filteredTransactions.forEach(t => {
            if (!breakdown[t.category]) {
                breakdown[t.category] = { income: 0, expense: 0 };
            }
            if (t.type === 'Income') {
                breakdown[t.category].income += t.amount;
            } else {
                breakdown[t.category].expense += t.amount;
            }
        });

        return Object.entries(breakdown)
            .map(([name, values]) => ({
                name,
                ...values,
                total: values.income + values.expense
            }))
            .sort((a, b) => b.total - a.total);
    }, [filteredTransactions]);

    const chartData = useMemo(() => {
        return categoryBreakdown.map(cat => ({
            name: cat.name,
            value: cat.total
        }));
    }, [categoryBreakdown]);

    const sortedTransactions = useMemo(() => {
        return [...filteredTransactions].sort((a, b) => dayjs(b.date).diff(dayjs(a.date)));
    }, [filteredTransactions]);

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
        const yearTransactions = transactions.filter(t => dayjs(t.date).tz('Asia/Seoul').year() === selectedYear);
        const income = yearTransactions
            .filter(t => t.type === 'Income')
            .reduce((sum, t) => sum + t.amount, 0);
        const expense = yearTransactions
            .filter(t => t.type === 'Expense')
            .reduce((sum, t) => sum + t.amount, 0);
        
        return {
            income,
            expense,
            profit: income - expense,
            count: yearTransactions.length
        };
    }, [transactions, selectedYear]);

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
                                                data={chartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {chartData.map((entry, index) => (
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

                    {/* Yearly Overview */}
                    <div className="bg-indigo-600 p-6 rounded-3xl shadow-lg text-white relative overflow-hidden print:bg-white print:text-gray-900 print:border print:border-gray-300 print:shadow-none">
                        <div className="absolute top-0 right-0 p-4 opacity-20 print:hidden">
                            <Calendar className="w-20 h-20" />
                        </div>
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            {selectedYear}년 누적 현황
                        </h2>
                        <div className="space-y-4 relative z-10">
                            <div className="flex justify-between items-end">
                                <span className="text-xs opacity-80">총 매출</span>
                                <span className="text-xl font-black">{yearlyStats.income.toLocaleString()}원</span>
                            </div>
                            <div className="flex justify-between items-end">
                                <span className="text-xs opacity-80">총 지출</span>
                                <span className="text-xl font-black">{yearlyStats.expense.toLocaleString()}원</span>
                            </div>
                            <div className="pt-4 border-t border-white/20 flex justify-between items-end">
                                <span className="text-sm font-bold">누적 순수익</span>
                                <span className="text-2xl font-black">{yearlyStats.profit.toLocaleString()}원</span>
                            </div>
                            <p className="text-[10px] opacity-60 text-right">총 {yearlyStats.count}건의 거래</p>
                        </div>
                    </div>
                </div>

                {/* Transaction History */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-3xl shadow-sm border border-[#E5E7EB] overflow-hidden print:shadow-none print:border-gray-300">
                        <div className="p-6 border-b border-[#E5E7EB] flex justify-between items-center bg-white">
                            <h2 className="text-lg font-bold text-[#1A1A1A]">상세 거래 내역</h2>
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full print:border print:border-gray-300">
                                총 {filteredTransactions.length}건
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
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter ${
                                                    t.type === 'Income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                                } print:bg-transparent print:border ${t.type === 'Income' ? 'print:border-emerald-200' : 'print:border-rose-200'}`}>
                                                    {t.type === 'Income' ? 'Income' : 'Expense'}
                                                </span>
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
                                    {filteredTransactions.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-20 text-center text-gray-400 text-sm italic">
                                                선택하신 기간에 거래 내역이 없습니다.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

