import React, { useState, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { Student, AttendanceRecord, Membership, ClassSchedule } from '../types';
import { SearchIcon, CloseIcon } from './icons';

dayjs.extend(utc);
dayjs.extend(timezone);

const CHOSUNG = [
    'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

function getChosung(text: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (code >= 0xAC00 && code <= 0xD7A3) {
            const chosungIndex = Math.floor((code - 0xAC00) / 588);
            result += CHOSUNG[chosungIndex];
        } else {
            result += text.charAt(i);
        }
    }
    return result;
}

function matchKorean(name: string, keyword: string): boolean {
    const normalizedName = (name || '').toLowerCase();
    const normalizedKeyword = (keyword || '').toLowerCase();
    
    if (normalizedName.includes(normalizedKeyword)) {
        return true;
    }
    
    const nameChosung = getChosung(normalizedName);
    const keywordChosung = getChosung(normalizedKeyword);
    return nameChosung.includes(keywordChosung);
}

interface ClassAttendanceModalProps {
    isOpen: boolean; 
    onClose: () => void; 
    students: Student[];
    memberships: Membership[];
    attendance: AttendanceRecord[];
    toggleAttendance?: (studentId: string, date: string, classTime: string, classId?: string) => void;
    submittingKeys?: string[];
    updateStudent?: (studentId: string, updates: Partial<Student>) => void;
    classInfo: { classItem: ClassSchedule, date: dayjs.Dayjs } 
}

const StudentAttendanceItem: React.FC<{
    student: Student;
    record: AttendanceRecord | undefined;
    dateString: string;
    classTimeString: string;
    classId: string;
    toggleAttendance?: (studentId: string, date: string, classTime: string, classId?: string) => void;
    isSubmitting?: boolean;
    updateStudent?: (studentId: string, updates: Partial<Student>) => void;
}> = React.memo(({ student, record, dateString, classTimeString, classId, toggleAttendance, isSubmitting, updateStudent }) => {
    
    const handleChange = () => {
        if (toggleAttendance) {
            toggleAttendance(student.id, dateString, classTimeString, classId);
        }
    };

    return (
        <div 
            onClick={handleChange}
            className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-gray-100 active:bg-gray-200/80 transition-all cursor-pointer flex justify-between items-center select-none"
        >
            <div>
                <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900">{student.name}</p>
                    {isSubmitting && (
                        <span className="inline-block w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" title="서버 동기화 중..." />
                    )}
                </div>
                <p className="text-[10px] text-gray-400 font-medium">{student.phone}</p>
            </div>
            <input 
                type="checkbox" 
                checked={!!record} 
                onChange={() => {}} 
                className="h-7 w-7 rounded-lg border-gray-200 text-indigo-600 focus:ring-indigo-500 transition-all duration-150 pointer-events-none"
            />
        </div>
    );
});

export const ClassAttendanceModal: React.FC<ClassAttendanceModalProps> = ({ 
    isOpen, onClose, students, memberships, attendance, toggleAttendance, submittingKeys, updateStudent, classInfo 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const { classItem, date } = classInfo;
    const dateString = date.format('YYYY-MM-DD');
    
    const classTimeString = useMemo(() => {
        if (classItem.className.includes('깊어지는')) {
            return `${classItem.startTime}~${classItem.endTime} - ${classItem.className}`;
        }
        return `${classItem.startTime} - ${classItem.className}`;
    }, [classItem]);

    const displayStudents = useMemo(() => {
        const targetDate = date.tz('Asia/Seoul').startOf('day');
        
        // 1. Get active students
        const active = students.filter(student => {
            const studentMemberships = memberships.filter(m => m.studentId === student.id);
            return studentMemberships.some(membership => {
                const startDate = dayjs(membership.startDate).tz('Asia/Seoul').startOf('day');
                const endDate = dayjs(membership.endDate).tz('Asia/Seoul').startOf('day');
                
                if (membership.holdStartDate && membership.holdEndDate) {
                    const holdStart = dayjs(membership.holdStartDate).tz('Asia/Seoul').startOf('day');
                    const holdEnd = dayjs(membership.holdEndDate).tz('Asia/Seoul').startOf('day');
                    if ((targetDate.isAfter(holdStart) || targetDate.isSame(holdStart)) && (targetDate.isBefore(holdEnd) || targetDate.isSame(holdEnd))) return false;
                }
                return (targetDate.isAfter(startDate) || targetDate.isSame(startDate)) && (targetDate.isBefore(endDate) || targetDate.isSame(endDate)) && !membership.refundAmount;
            });
        });

        // 2. Get attended students for this specific class
        const attended = attendance
            .filter(a => {
                const aDate = dayjs(a.date).tz('Asia/Seoul').format('YYYY-MM-DD');
                return aDate === dateString && a.classId === classItem.id;
            })
            .map(a => {
                const s = students.find(s => s.id === a.studentId);
                return s || { 
                    id: a.studentId || `temp-${a.id}`, 
                    name: (a as any).name || a.studentName || (a as any)['이름'] || 'Unknown', 
                    phone: (a as any).phone || a.studentPhone || (a as any)['연락처'] || '', 
                    registrationDate: '' 
                } as Student;
            });

        // 3. Merge and deduplicate
        const studentMap = new Map<string, Student>();
        active.forEach(s => studentMap.set(s.id, s));
        attended.forEach(s => studentMap.set(s.id, s as Student));

        return Array.from(studentMap.values())
            .filter(s => matchKorean(s.name || '', searchTerm))
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            
    }, [students, memberships, date, searchTerm, attendance, dateString, classItem.id]);
    
    const attendanceMap = useMemo(() => {
        const map = new Map<string, AttendanceRecord>();
        attendance.forEach(a => {
            const aDate = dayjs(a.date).tz('Asia/Seoul').format('YYYY-MM-DD');
            if (aDate === dateString && a.classId === classItem.id) {
                map.set(a.studentId, a);
            }
        });
        return map;
    }, [attendance, dateString, classItem.id]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full border border-indigo-100">
                                {classItem.startTime} 수업
                            </span>
                            <span className="text-xs text-gray-400 font-medium">
                                {date.format('MM월 DD일 dddd')}
                            </span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{classItem.className}</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 transition-colors"><CloseIcon className="w-6 h-6" /></button>
                </div>
                <div className="relative mb-6">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="회원 이름 검색..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"/>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                    {displayStudents.map(student => {
                        const opKey = `${student.id}_${dateString}_${classItem.id}`;
                        const isStudentSubmitting = submittingKeys?.includes(opKey);
                        return (
                            <StudentAttendanceItem 
                                key={student.id}
                                student={student}
                                record={attendanceMap.get(student.id)}
                                dateString={dateString}
                                classTimeString={classTimeString}
                                classId={classItem.id}
                                toggleAttendance={toggleAttendance}
                                isSubmitting={isStudentSubmitting}
                                updateStudent={updateStudent}
                            />
                        );
                    })}
                    {displayStudents.length === 0 && <div className="py-12 text-center text-gray-400">유효한 회원이 없습니다.</div>}
                </div>
                 <div className="pt-6 mt-auto">
                    <button onClick={onClose} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100">확인</button>
                 </div>
            </div>
        </div>
    );

};
