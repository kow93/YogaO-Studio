
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Student, Membership } from '../types';

interface DashboardProps {
    students: Student[];
    memberships: Membership[];
}

const StatCard: React.FC<{ title: string; value: string | number; description: string }> = ({ title, value, description }) => (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
);

const getWeekNumber = (d: Date): number => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
};


export const Dashboard: React.FC<DashboardProps> = ({ students, memberships }) => {
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

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
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

    const processRevenueData = (period: 'week' | 'month' | 'year') => {
        const data: { [key: string]: number } = {};

        memberships.forEach(m => {
            const date = new Date(m.startDate);
            let key = '';

            if (period === 'week') {
                const year = date.getFullYear();
                const week = getWeekNumber(date);
                key = `${year}-W${week.toString().padStart(2, '0')}`;
            } else if (period === 'month') {
                key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            } else { // year
                key = date.getFullYear().toString();
            }

            if (!data[key]) {
                data[key] = 0;
            }
            data[key] += m.price;
        });

        return Object.entries(data).map(([name, revenue]) => ({ name, 매출: revenue })).sort((a,b) => a.name.localeCompare(b.name));
    };

    const weeklyRevenue = processRevenueData('week');
    const monthlyRevenue = processRevenueData('month');
    const yearlyRevenue = processRevenueData('year');

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800">대시보드</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="총 매출" value={formatCurrency(totalRevenue)} description="누적된 전체 매출입니다." />
                <StatCard title="총 회원 수" value={students.length} description="지금까지 등록한 총 회원 수입니다." />
                <StatCard title="활성 회원 수" value={activeMemberships.length} description="현재 이용권이 유효한 회원입니다." />
                <StatCard title="홀딩 회원 수" value={holdingMembersCount} description="현재 이용권을 홀딩 중인 회원입니다." />
            </div>

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
                <RevenueChart title="주별 매출" data={weeklyRevenue} />
                <RevenueChart title="월별 매출" data={monthlyRevenue} />
                <RevenueChart title="연도별 매출" data={yearlyRevenue} />
            </div>
        </div>
    );
};

const RevenueChart: React.FC<{ title: string; data: { name: string; 매출: number }[] }> = ({ title, data }) => (
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
                </BarChart>
            </ResponsiveContainer>
        ) : (
            <div className="flex items-center justify-center h-72 text-gray-500">
                매출 데이터가 없습니다.
            </div>
        )}
    </div>
);
