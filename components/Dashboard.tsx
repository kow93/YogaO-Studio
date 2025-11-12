import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Student, Membership, Expense, AttendanceRecord, ClassSchedule } from '../types';
import { AttendanceAnalytics } from './AttendanceAnalytics';

interface DashboardProps {
    students: Student[];
    memberships: Membership[];
    expenses: Expense[];
    attendance: AttendanceRecord[];
    schedule: ClassSchedule[];
}

const StatCard: React.FC<{ title: string; value: string | number; description: string }> = ({ title, value, description }) => (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ students, memberships, expenses, attendance, schedule }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeMemberships = memberships.filter(m => {
        const endDate = new Date(m.endDate);
        const isHolding = m.holdStartDate && m.holdEndDate && today >= new Date(m.holdStartDate) && today <= new Date(m.holdEndDate);
        return endDate >= today && !isHolding;
    });

    const holdingMembersCount = memberships.filter(m => {
        if (!m.holdStartDate || !m.holdEndDate) return false;
        const holdStart = new Date(m.holdStartDate);
        const holdEnd = new Date(m.holdEndDate);
        return today >= holdStart && today <= holdEnd;
    }).length;

    const totalRevenue = memberships.reduce((acc, m) => acc + m.price, 0);
    
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const membershipsThisMonth = memberships.filter(m => {
        const startDate = new Date(m.startDate);
        return startDate >= firstDayOfMonth && startDate <= lastDayOfMonth;
    });

    const studentIdsWhoPaidThisMonth = [...new Set(membershipsThisMonth.map(m => m.studentId))];

    const newMembersThisMonthCount = studentIdsWhoPaidThisMonth.filter(studentId => {
        const student = students.find(s => s.id === studentId);
        if (student) {
            const regDate = new Date(student.registrationDate);
            return regDate >= firstDayOfMonth && regDate <= lastDayOfMonth;
        }
        return false;
    }).length;

    const reregisteredMembersThisMonthCount = studentIdsWhoPaidThisMonth.filter(studentId => {
        const student = students.find(s => s.id === studentId);
        if (student) {
            const regDate = new Date(student.registrationDate);
            return regDate < firstDayOfMonth;
        }
        return false;
    }).length;


    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
    };
    
    const expiringIn7Days = memberships
    .filter(m => {
        const endDate = new Date(m.endDate);
        endDate.setHours(0, 0, 0, 0);
        
        if (endDate < today) return false;
        if (m.holdStartDate && m.holdEndDate) {
             const holdStart = new Date(m.holdStartDate);
             const holdEnd = new Date(m.holdEndDate);
             if (today >= holdStart && today <= holdEnd) return false;
        }

        const diffTime = endDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
    })
    .map(m => ({
        ...m,
        studentName: students.find(s => s.id === m.studentId)?.name || '알 수 없는 회원'
    }))
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

    const handleSendReminder = (studentName: string) => {
        alert(`${studentName}님에게 재등록 알림 메시지를 보냈습니다. (시뮬레이션)`);
    };

    const firstDayOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const lastDayOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);

    const expiringSoonMembers = memberships
        .filter(m => {
            const endDate = new Date(m.endDate);
            return endDate >= firstDayOfNextMonth && endDate <= lastDayOfNextMonth;
        })
        .map(m => {
            const student = students.find(s => s.id === m.studentId);
            return {
                ...m,
                studentName: student ? student.name : '알 수 없는 회원',
            };
        })
        .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
    
    const processComparisonData = (period: 'month' | 'year') => {
        const revenueMap: { [key: string]: number } = {};
        memberships.forEach(m => {
            const date = new Date(m.startDate);
            let key = '';
            if (period === 'month') {
                key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            } else { // year
                key = date.getFullYear().toString();
            }
            revenueMap[key] = (revenueMap[key] || 0) + m.price;
        });

        const expenseMap: { [key: string]: number } = {};
        expenses.forEach(e => {
            const date = new Date(e.date);
            let key = '';
            if (period === 'month') {
                key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            } else { // year
                key = date.getFullYear().toString();
            }
            expenseMap[key] = (expenseMap[key] || 0) + e.amount;
        });

        const allKeys = [...new Set([...Object.keys(revenueMap), ...Object.keys(expenseMap)])].sort();

        return allKeys.map(key => ({
            name: key,
            매출: revenueMap[key] || 0,
            지출: expenseMap[key] || 0,
        }));
    };

    const monthlyComparisonData = processComparisonData('month');
    const yearlyComparisonData = processComparisonData('year');


    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800">대시보드</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="총 회원 수" value={students.length} description="지금까지 등록한 총 회원 수입니다." />
                <StatCard title="활성 회원 수" value={activeMemberships.length} description="현재 이용권이 유효한 회원입니다." />
                <StatCard title="홀딩 회원 수" value={holdingMembersCount} description="현재 이용권을 홀딩 중인 회원입니다." />
                <StatCard title="이번 달 신규 회원" value={`${newMembersThisMonthCount}명`} description="이번 달에 처음 등록한 회원입니다." />
                <StatCard title="이번 달 재등록" value={`${reregisteredMembersThisMonthCount}명`} description="이번 달에 이용권을 갱신한 회원입니다." />
                <StatCard title="총 매출" value={formatCurrency(totalRevenue)} description="누적된 전체 매출입니다." />

            </div>
            
            <div className="bg-orange-50 p-6 rounded-lg shadow-md border border-orange-200">
                <h2 className="text-xl font-semibold text-orange-800 mb-4">
                    만료 임박 회원 (7일 이내) ({expiringIn7Days.length}명)
                </h2>
                {expiringIn7Days.length > 0 ? (
                    <ul className="divide-y divide-orange-200 max-h-72 overflow-y-auto">
                        {expiringIn7Days.map(m => (
                            <li key={m.id} className="py-3 flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{m.studentName}</p>
                                    <p className="text-sm text-gray-500">{m.passType}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-sm text-gray-600 text-right">
                                        <span className="font-medium text-red-600">만료일:</span> {new Date(m.endDate).toLocaleDateString('ko-KR')}
                                    </div>
                                    <button 
                                        onClick={() => handleSendReminder(m.studentName)}
                                        className="bg-orange-400 text-white px-3 py-1 text-xs font-semibold rounded-md hover:bg-orange-500 whitespace-nowrap"
                                    >
                                        알림 보내기
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="flex items-center justify-center h-24 text-gray-500">
                        7일 이내에 만료되는 회원이 없습니다.
                    </div>
                )}
            </div>

            <AttendanceAnalytics attendance={attendance} schedule={schedule} />

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">
                    다음 달 재등록 예정 회원 ({expiringSoonMembers.length}명)
                </h2>
                {expiringSoonMembers.length > 0 ? (
                    <ul className="divide-y divide-gray-200 max-h-72 overflow-y-auto">
                        {expiringSoonMembers.map(m => (
                            <li key={m.id} className="py-3 flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{m.studentName}</p>
                                    <p className="text-sm text-gray-500">{m.passType}</p>
                                </div>
                                <div className="text-sm text-gray-600 text-right">
                                    <span className="font-medium">만료일:</span> {new Date(m.endDate).toLocaleDateString('ko-KR')}
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="flex items-center justify-center h-24 text-gray-500">
                        다음 달에 만료되는 회원이 없습니다.
                    </div>
                )}
            </div>

            <div className="space-y-8">
                <ComparisonChart title="월별 매출 및 지출" data={monthlyComparisonData} />
                <ComparisonChart title="연도별 매출 및 지출" data={yearlyComparisonData} />
            </div>
        </div>
    );
};

const ComparisonChart: React.FC<{ title: string; data: { name: string; 매출: number; 지출: number }[] }> = ({ title, data }) => (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">{title}</h2>
        {data.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} />
                    <Tooltip formatter={(value: number) => new Intl.NumberFormat('ko-KR').format(value) + '원'} />
                    <Legend />
                    <Bar dataKey="매출" fill="#6366f1" />
                    <Bar dataKey="지출" fill="#f87171" />
                </BarChart>
            </ResponsiveContainer>
        ) : (
            <div className="flex items-center justify-center h-72 text-gray-500">
                매출 또는 지출 데이터가 없습니다.
            </div>
        )}
    </div>
);