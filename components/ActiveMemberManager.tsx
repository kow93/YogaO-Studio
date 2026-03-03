
import React, { useState, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import { Student, Membership, AttendanceRecord, PassType } from '../types';
import { SearchIcon, CloseIcon } from './icons';

interface ActiveMemberManagerProps {
    students: Student[];
    memberships: Membership[];
    attendance: AttendanceRecord[];
    updateStudent: (studentId: string, updates: Partial<Student>) => void;
    updateStudentAndMembership?: (studentId: string, membershipId: string, studentUpdates: Partial<Student>, membershipUpdates: Partial<Membership>) => void;
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
    updateStudent,
    updateStudentAndMembership
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingMember, setEditingMember] = useState<(Student & { membership?: Membership }) | null>(null);
    const [editForm, setEditForm] = useState({
        name: '',
        phone: '',
        passType: '',
        startDate: '',
        endDate: '',
        holdStartDate: '',
        holdEndDate: '',
    });

    const openEditModal = (member: Student & { membership?: Membership }) => {
        if (!member.membership) {
            alert("이용권 정보가 없는 회원입니다. 멤버십 관리 탭에서 이용권을 먼저 등록해주세요.");
            return;
        }
        setEditingMember(member);
        setEditForm({
            name: member.name,
            phone: member.phone,
            passType: member.membership.passType,
            startDate: dayjs(member.membership.startDate).format('YYYY-MM-DD'),
            endDate: dayjs(member.membership.endDate).format('YYYY-MM-DD'),
            holdStartDate: member.membership.holdStartDate ? dayjs(member.membership.holdStartDate).format('YYYY-MM-DD') : '',
            holdEndDate: member.membership.holdEndDate ? dayjs(member.membership.holdEndDate).format('YYYY-MM-DD') : '',
        });
    };

    const handleEditSubmit = () => {
        if (!editingMember || !editingMember.membership || !updateStudentAndMembership) return;
        
        const membershipUpdates: Partial<Membership> = {
            passType: editForm.passType as PassType,
            startDate: new Date(editForm.startDate).toISOString(),
        };

        if (editForm.holdStartDate && editForm.holdEndDate) {
            membershipUpdates.holdStartDate = new Date(editForm.holdStartDate).toISOString();
            membershipUpdates.holdEndDate = new Date(editForm.holdEndDate).toISOString();
            // Omit endDate to let App.tsx auto-calculate it based on hold duration
        } else {
            membershipUpdates.holdStartDate = null as any;
            membershipUpdates.holdEndDate = null as any;
            membershipUpdates.endDate = new Date(editForm.endDate).toISOString();
        }

        updateStudentAndMembership(
            editingMember.id,
            editingMember.membership.id,
            { name: editForm.name, phone: editForm.phone },
            membershipUpdates
        );
        setEditingMember(null);
    };

    const activeMembers = useMemo(() => {
        return students.map(student => {
            if (!student) return null;
            
            const studentMemberships = memberships.filter(m => m.studentId === student.id && !m.refundAmount);
            
            // Sort by end date descending to find the latest one
            const latestMembership = studentMemberships.sort((a, b) => 
                dayjs(b.endDate).valueOf() - dayjs(a.endDate).valueOf()
            )[0];
            
            return {
                ...student,
                membership: latestMembership
            };
        }).filter((s): s is (Student & { membership?: Membership }) => s !== null)
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [students, memberships]);

    const filteredMembers = useMemo(() => {
        return activeMembers
            .filter(m => 
                (m.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
                (m.phone || '').includes(searchTerm)
            );
    }, [activeMembers, searchTerm]);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        const d = dayjs(dateStr);
        return d.isValid() ? d.format('YYYY-MM-DD') : '-';
    };

    const calculateAttendanceRate = (studentId: string, passType?: PassType) => {
        if (!passType) return '-';
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
                                    <td className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => openEditModal(member)}>
                                        <div className="font-bold text-indigo-600 hover:underline">{member.name}</div>
                                        <div className="text-xs text-gray-500">{member.phone}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-700">{member.membership?.passType || '없음'}</div>
                                        {member.membership?.holdStartDate && member.membership?.holdEndDate && (
                                            <div className="text-xs font-bold text-amber-500 mt-1">
                                                (홀딩중 {dayjs(member.membership.holdStartDate).format('YY/MM/DD')} ~ {dayjs(member.membership.holdEndDate).format('YY/MM/DD')})
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-600">
                                            {member.membership ? formatDate(member.membership.endDate) : '-'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-indigo-600">
                                            {calculateAttendanceRate(member.id, member.membership?.passType)}
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

            {editingMember && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">회원 및 이용권 수정</h2>
                            <button onClick={() => setEditingMember(null)} className="text-gray-400 hover:text-gray-600">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                                <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
                                <input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">이용권 종류</label>
                                <select value={editForm.passType} onChange={e => setEditForm({...editForm, passType: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                                    {Object.values(PassType).map(pt => (
                                        <option key={pt} value={pt}>{pt}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
                                    <input type="date" value={editForm.startDate} onChange={e => setEditForm({...editForm, startDate: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">만료일 (수동)</label>
                                    <input type="date" value={editForm.endDate} onChange={e => setEditForm({...editForm, endDate: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                            </div>
                            
                            <div className="pt-4 border-t border-gray-100">
                                <h3 className="text-sm font-bold text-gray-900 mb-3">홀딩 (일시정지) 설정</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">홀딩 시작일</label>
                                        <input type="date" value={editForm.holdStartDate} onChange={e => setEditForm({...editForm, holdStartDate: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">홀딩 종료일</label>
                                        <input type="date" value={editForm.holdEndDate} onChange={e => setEditForm({...editForm, holdEndDate: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                </div>
                                <p className="text-xs text-indigo-600 mt-2">* 홀딩 기간을 설정하면 만료일이 자동으로 연장됩니다.</p>
                            </div>

                            <button onClick={handleEditSubmit} className="w-full py-4 mt-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                                저장하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
