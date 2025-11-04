
import React, { useState, useMemo } from 'react';
import { Student, AttendanceRecord, Membership } from '../types';

interface AttendanceTrackerProps {
    students: Student[];
    memberships: Membership[];
    attendance: AttendanceRecord[];
    toggleAttendance: (studentId: string, date: string) => void;
}

export const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({ students, memberships, attendance, toggleAttendance }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const activeStudents = useMemo(() => {
        return students.filter(student => {
            const membership = memberships.find(m => m.studentId === student.id);
            if (!membership) return false;
            const startDate = new Date(membership.startDate);
            const endDate = new Date(membership.endDate);
            startDate.setHours(0,0,0,0);
            endDate.setHours(23,59,59,999);
            const targetDate = new Date(currentDate);
            targetDate.setHours(12,0,0,0);
            return targetDate >= startDate && targetDate <= endDate;
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [students, memberships, currentDate]);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentDate(new Date(e.target.value));
    };

    const isAttended = (studentId: string, date: string) => {
        return attendance.some(a => a.studentId === studentId && a.date === date);
    };

    const dateString = currentDate.toISOString().split('T')[0];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-800">출결 관리</h1>
                <div className="flex items-center gap-2">
                    <label htmlFor="attendance-date" className="text-sm font-medium">날짜 선택:</label>
                    <input
                        id="attendance-date"
                        type="date"
                        value={dateString}
                        onChange={handleDateChange}
                        className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="p-4 bg-gray-50 border-b">
                    <h2 className="text-lg font-semibold text-gray-700">
                        {currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })} 출석부
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                            <tr>
                                <th scope="col" className="px-6 py-3">이름</th>
                                <th scope="col" className="px-6 py-3">연락처</th>
                                <th scope="col" className="px-6 py-3 text-center">출석</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeStudents.length > 0 ? activeStudents.map(student => (
                                <tr key={student.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{student.name}</td>
                                    <td className="px-6 py-4">{student.phone}</td>
                                    <td className="px-6 py-4 text-center">
                                        <input
                                            type="checkbox"
                                            checked={isAttended(student.id, dateString)}
                                            onChange={() => toggleAttendance(student.id, dateString)}
                                            className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        />
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={3} className="text-center py-10 text-gray-500">해당 날짜에 유효한 회원이 없습니다.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
