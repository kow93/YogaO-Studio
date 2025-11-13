import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Membership, Expense, Student, PassType, ExpenseCategory } from '../types';

interface FinancialReportProps {
    memberships: Membership[];
    expenses: Expense[];
    students: Student[];
}

const formatDate = (date: Date) => date.toISOString().split('T')[0];
const formatCurrency = (amount: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent === 0) return null;

    return (
        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-semibold">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};


export const FinancialReport: React.FC<FinancialReportProps> = ({ memberships, expenses, students }) => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const [startDate, setStartDate] = useState(formatDate(firstDayOfMonth));
    const [endDate, setEndDate] = useState(formatDate(lastDayOfMonth));

    const {
        totalRevenue,
        totalExpense,
        netProfit,
        revenueByPassType,
        expenseByCategory,
        combinedTransactions,
        newMembersCount,
        reregisteredMembersCount,
    } = useMemo(() => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const membershipsInPeriod = memberships.filter(m => {
            const paymentDate = new Date(m.paymentDate || m.startDate);
            return paymentDate >= start && paymentDate <= end;
        });

        const expensesInPeriod = expenses.filter(e => {
            const eDate = new Date(e.date);
            return eDate >= start && eDate <= end;
        });
        
        const tr = membershipsInPeriod.reduce((acc, m) => acc + m.price, 0);
        const te = expensesInPeriod.reduce((acc, e) => acc + e.amount, 0);
        
        const revByPass: { [key: string]: number } = {};
        membershipsInPeriod.forEach(m => {
            revByPass[m.passType] = (revByPass[m.passType] || 0) + m.price;
        });
        const revByPassData = Object.entries(revByPass).map(([name, value]) => ({ name, value: value || 0}));
        
        const expByCat: { [key: string]: number } = {};
        expensesInPeriod.forEach(e => {
            expByCat[e.category] = (expByCat[e.category] || 0) + e.amount;
        });
        const expByCatData = Object.entries(expByCat).map(([name, value]) => ({ name, value: value || 0}));

        const incomeTransactions = membershipsInPeriod.map(m => ({
            date: m.paymentDate || m.startDate,
            type: '매출',
            description: `${students.find(s => s.id === m.studentId)?.name || '알수없음'} - ${m.passType}`,
            amount: m.price
        }));
        const expenseTransactions = expensesInPeriod.map(e => ({
            date: e.date,
            type: '지출',
            description: `${e.category} - ${e.description}`,
            amount: -e.amount
        }));
        
        const combined = [...incomeTransactions, ...expenseTransactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const studentIdsWhoPaidInPeriod = [...new Set(membershipsInPeriod.map(m => m.studentId))];

        const newMembers = studentIdsWhoPaidInPeriod.filter(studentId => {
            const student = students.find(s => s.id === studentId);
            if (student) {
                const regDate = new Date(student.registrationDate);
                return regDate >= start && regDate <= end;
            }
            return false;
        }).length;

        const reregisteredMembers = studentIdsWhoPaidInPeriod.filter(studentId => {
            const student = students.find(s => s.id === studentId);
            if (student) {
                const regDate = new Date(student.registrationDate);
                return regDate < start;
            }
            return false;
        }).length;

        return {
            totalRevenue: tr,
            totalExpense: te,
            netProfit: tr - te,
            revenueByPassType: revByPassData,
            expenseByCategory: expByCatData,
            combinedTransactions: combined,
            newMembersCount: newMembers,
            reregisteredMembersCount: reregisteredMembers
        };
    }, [startDate, endDate, memberships, expenses, students]);

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800">재무 리포트</h1>
            
            <div className="bg-white p-4 rounded-lg shadow-md border flex flex-wrap items-center gap-4">
                 <h2 className="text-lg font-semibold text-gray-700">기간 선택:</h2>
                <div>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-gray-300 rounded-md py-2 px-3"/>
                </div>
                <span>~</span>
                 <div>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-gray-300 rounded-md py-2 px-3"/>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg shadow-md border border-blue-200">
                    <h3 className="text-sm font-medium text-blue-800">총 매출</h3>
                    <p className="mt-2 text-3xl font-bold text-blue-900">{formatCurrency(totalRevenue)}</p>
                </div>
                 <div className="bg-red-50 p-6 rounded-lg shadow-md border border-red-200">
                    <h3 className="text-sm font-medium text-red-800">총 지출</h3>
                    <p className="mt-2 text-3xl font-bold text-red-900">{formatCurrency(totalExpense)}</p>
                </div>
                 <div className="bg-green-50 p-6 rounded-lg shadow-md border border-green-200">
                    <h3 className="text-sm font-medium text-green-800">순이익</h3>
                    <p className="mt-2 text-3xl font-bold text-green-900">{formatCurrency(netProfit)}</p>
                </div>
            </div>

             <div className="bg-white p-6 rounded-lg shadow-md border">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">회원 분석</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                        <h3 className="text-sm font-medium text-purple-800">신규 회원</h3>
                        <p className="mt-2 text-3xl font-bold text-purple-900">{newMembersCount}명</p>
                        <p className="mt-1 text-sm text-purple-600">선택된 기간에 처음 등록하고 결제한 회원 수</p>
                    </div>
                    <div className="bg-teal-50 p-6 rounded-lg border border-teal-200">
                        <h3 className="text-sm font-medium text-teal-800">재등록 회원</h3>
                        <p className="mt-2 text-3xl font-bold text-teal-900">{reregisteredMembersCount}명</p>
                        <p className="mt-1 text-sm text-teal-600">선택된 기간에 기존 회원이 이용권을 갱신한 수</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md border">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">매출 분석 (이용권별)</h2>
                    {revenueByPassType.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={revenueByPassType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" labelLine={false} label={renderCustomizedLabel}>
                                {revenueByPassType.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                    ) : <div className="flex items-center justify-center h-72 text-gray-500">매출 데이터가 없습니다.</div>}
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md border">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">지출 분석 (카테고리별)</h2>
                    {expenseByCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#FF8042" labelLine={false} label={renderCustomizedLabel}>
                                {expenseByCategory.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS.slice().reverse()[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                    ) : <div className="flex items-center justify-center h-72 text-gray-500">지출 데이터가 없습니다.</div>}
                </div>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                <h2 className="text-xl font-semibold text-gray-700 p-6">상세 거래 내역</h2>
                 <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                        <tr>
                            <th scope="col" className="px-6 py-3">날짜</th>
                            <th scope="col" className="px-6 py-3">구분</th>
                            <th scope="col" className="px-6 py-3">내용</th>
                            <th scope="col" className="px-6 py-3 text-right">금액</th>
                        </tr>
                    </thead>
                    <tbody>
                        {combinedTransactions.length > 0 ? combinedTransactions.map((t, i) => (
                            <tr key={`${t.date}-${i}`} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">{new Date(t.date).toLocaleDateString('ko-KR')}</td>
                                <td className="px-6 py-4">
                                     <span className={`px-2 py-1 text-xs font-semibold rounded-full ${t.type === '매출' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                                        {t.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4">{t.description}</td>
                                <td className={`px-6 py-4 text-right font-medium ${t.amount > 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(t.amount)}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="text-center py-10 text-gray-500">선택된 기간에 거래 내역이 없습니다.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};