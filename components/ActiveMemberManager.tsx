
import React, { useState, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import { Student, Membership, AttendanceRecord, PassType } from '../types';
import { SearchIcon } from './icons';

interface ActiveMemberManagerProps {
    students: Student[];
    memberships: Membership[];
    attendance: AttendanceRecord[];
    updateStudent: (studentId: string, updates: Partial<Student>) => void;
}

const MemoInput = ({ value, onSave }: { value: string, onSave: (val: string) => void }) => {
    const [localValue, setLocalValue] = useState(value);
    
    useEffect(() => {
        setLocalValue(value || '');
    }, [value]);

    const handleBlur = () => {
        if (localValue !== (value || '')) {
            onSave(localValue);
        }
    };

    return (
        <input 
            type="text" 
            value={localValue} 
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            placeholder="특이사항 입력"
            className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 outline-none text-sm py-1 transition-colors"
        />
    );
};

export const ActiveMemberManager: React.FC<ActiveMemberManagerProps> = ({ 
    students, 
    memberships, 
    attendance,
    updateStudent
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const activeMembers = useMemo(() => {
        // Get today's date in KST (UTC+9)
        const today = dayjs().utcOffset(9).startOf('day');

        return students.map(student => {
            if (!student) return null;
            
            const studentMemberships = memberships.filter(m => m.studentId === student.id && !m.refundAmount);
            if (studentMemberships.length === 0) return null;

            // Sort by end date descending to find the latest one
            const latestMembership = studentMemberships.sort((a, b) => 
                dayjs(b.endDate).valueOf() - dayjs(a.endDate).valueOf()
            )[0];
            
            if (!latestMembership || !latestMembership.endDate) return null;

            const endDate = dayjs(latestMembership.endDate).startOf('day');
            if (!endDate.isValid()) return null;

            // Filter: end_date must be today or in the future
            if (endDate.isBefore(today)) return null;

            return {
                ...student,
                membership: latestMembership
            };
        }).filter((s): s is (Student & { membership: Membership }) => s !== null);
    }, [students, memberships]);

    const filteredMembers = useMemo(() => {
        return activeMembers
            .filter(m => 
                (m.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
                (m.phone || '').includes(searchTerm)
            )
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [activeMembers, searchTerm]);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        const d = dayjs(dateStr);
        return d.isValid() ? d.format('YYYY-MM-DD') : '-';
    };

    const calculateAttendanceRate = (studentId: string, passType: PassType) => {
        const today = dayjs();
        const threeMonthsAgo = today.subtract(90, 'day');
        
        // Count attendance in last 90 days
        const attendanceCount = attendance.filter(a => 
            a.studentId === studentId && 
            dayjs(a.date).isAfter(threeMonthsAgo) && 
            dayjs(a.date).isBefore(today.add(1, 'day'))
        ).length;

        // Calculate expected attendance based on pass type frequency
        let weeklyFrequency = 0;
        if (passType.includes('주 2회')) weeklyFrequency = 2;
        else if (passType.includes('주 3회')) weeklyFrequency = 3;
        else if (passType.includes('주 5회')) weeklyFrequency = 5;
        
        // If frequency is 0 (e.g. One Day, 1 Week, or unknown), just show count
        if (weeklyFrequency === 0) {
            return `${attendanceCount}회 (최근 3개월)`;
        }

        const weeks = 90 / 7;
        const expected = weeks * weeklyFrequency;
        const rate = Math.min(100, Math.round((attendanceCount / expected) * 100));

        return `${rate}% (${attendanceCount}/${Math.round(expected)})`;
    };

    const handleMemoSave = (studentId: string, newMemo: string) => {
        updateStudent(studentId, { memo: newMemo });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">유효 회원 관리</h2>
                    <p className="text-gray-500 mt-1">현재 이용권이 유효한 회원 목록</p>
                </div>
                <div className="flex gap-4">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="이름 또는 연락처 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none w-64 shadow-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">회원 정보</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">이용권 정보</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">만료일</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">최근 3개월 출석률</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">비고 (Memo)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredMembers.map(member => (
                                <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{member.name}</div>
                                        <div className="text-xs text-gray-500">{member.phone}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-700">{member.membership.passType}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-600">
                                            {formatDate(member.membership.endDate)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-indigo-600">
                                            {calculateAttendanceRate(member.id, member.membership.passType)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <MemoInput 
                                            value={member.memo || ''} 
                                            onSave={(val) => handleMemoSave(member.id, val)}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredMembers.length === 0 && (
                    <div className="p-12 text-center text-gray-400">
                        검색 결과가 없거나 유효한 회원이 없습니다.
                    </div>
                )}
            </div>
        </div>
    );
};
