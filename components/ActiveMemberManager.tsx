
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { Student, Membership, AttendanceRecord, PassType, Transaction } from '../types';
import { SearchIcon, CloseIcon, DownloadIcon, FinancialsIcon } from './icons';
import { PASS_PRICES, PASS_OPTIONS } from '../constants';
import * as XLSX from 'xlsx';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.tz.setDefault('Asia/Seoul');

interface ActiveMemberManagerProps {
    students: Student[];
    memberships: Membership[];
    attendance: AttendanceRecord[];
    updateStudent: (studentId: string, updates: Partial<Student>) => void;
    updateStudentAndMembership?: (studentId: string, membershipId: string, studentUpdates: Partial<Student>, membershipUpdates: Partial<Membership>) => void;
    upgradeMembership?: (originalMembershipId: string, newPassType: PassType, paymentMethod: '카드' | '현금', cashReceiptIssued: boolean) => void;
    deleteStudent?: (studentId: string) => void;
    bulkExtendMemberships?: (targetMembershipIds: string[], days: number, reason: string) => Promise<boolean>;
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
    updateStudentAndMembership,
    upgradeMembership,
    deleteStudent,
    bulkExtendMemberships
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingMember, setEditingMember] = useState<(Student & { membership?: Membership }) | null>(null);
    const [showUpgradeUI, setShowUpgradeUI] = useState(false);
    const [upgradePassType, setUpgradePassType] = useState<PassType>(PassType.MONTHLY_3_PER_WEEK);
    const [upgradePaymentMethod, setUpgradePaymentMethod] = useState<'카드' | '현금'>('카드');
    const [upgradeCashReceipt, setUpgradeCashReceipt] = useState(false);

    // Vacation Extension State
    const [showVacationModal, setShowVacationModal] = useState(false);
    const [vacationStartDate, setVacationStartDate] = useState('2026-08-12');
    const [vacationEndDate, setVacationEndDate] = useState('2026-08-14');
    const [vacationDays, setVacationDays] = useState(3);
    const [vacationReason, setVacationReason] = useState('스튜디오 방학 (08/12 ~ 08/14)');
    const [selectedMembershipIds, setSelectedMembershipIds] = useState<string[]>([]);
    const [vacationSearchTerm, setVacationSearchTerm] = useState('');
    const [isProcessingVacation, setIsProcessingVacation] = useState(false);

    // Calculate vacation days automatically when start/end dates change
    const handleVacationDateChange = (start: string, end: string) => {
        setVacationStartDate(start);
        setVacationEndDate(end);
        if (start && end) {
            const dStart = dayjs(start);
            const dEnd = dayjs(end);
            if (dStart.isValid() && dEnd.isValid() && (dEnd.isAfter(dStart) || dEnd.isSame(dStart))) {
                const diff = dEnd.diff(dStart, 'day') + 1;
                setVacationDays(diff);
                setVacationReason(`스튜디오 방학 (${dStart.format('MM/DD')} ~ ${dEnd.format('MM/DD')})`);
            }
        }
    };

    const vacationEligibleMembers = useMemo(() => {
        if (!vacationStartDate || !vacationEndDate) return [];
        const vStart = dayjs(vacationStartDate).startOf('day');
        const vEnd = dayjs(vacationEndDate).startOf('day');

        return students.map(student => {
            if (!student) return null;

            const studentMemberships = memberships.filter(m => {
                if (m.studentId !== student.id) return false;
                if (m.refundAmount) return false; // Exclude refunded

                const mStart = dayjs(m.startDate).startOf('day');
                const mEnd = dayjs(m.endDate).startOf('day');

                // Active around vacation period
                return mEnd.isSameOrAfter(vStart) && mStart.isSameOrBefore(vEnd);
            });

            if (studentMemberships.length === 0) return null;

            const latestMembership = studentMemberships.sort((a, b) => 
                dayjs(b.endDate).valueOf() - dayjs(a.endDate).valueOf()
            )[0];

            const currentEnd = dayjs(latestMembership.endDate);
            const projectedEnd = currentEnd.isValid() ? currentEnd.add(vacationDays, 'day') : currentEnd;

            return {
                student,
                membership: latestMembership,
                currentEndDate: currentEnd.isValid() ? currentEnd.format('YYYY-MM-DD') : '-',
                projectedEndDate: projectedEnd.isValid() ? projectedEnd.format('YYYY-MM-DD') : '-'
            };
        }).filter((item): item is { student: Student; membership: Membership; currentEndDate: string; projectedEndDate: string } => item !== null)
        .sort((a, b) => (a.student.name || '').localeCompare(b.student.name || ''));
    }, [students, memberships, vacationStartDate, vacationEndDate, vacationDays]);

    const openVacationModal = useCallback(() => {
        const start = '2026-08-12';
        const end = '2026-08-14';
        setVacationStartDate(start);
        setVacationEndDate(end);
        const days = dayjs(end).diff(dayjs(start), 'day') + 1;
        setVacationDays(days);
        setVacationReason(`스튜디오 여름 방학 (${dayjs(start).format('MM/DD')} ~ ${dayjs(end).format('MM/DD')})`);
        
        const vStart = dayjs(start).startOf('day');
        const vEnd = dayjs(end).startOf('day');
        const eligibleIds: string[] = [];

        students.forEach(student => {
            if (!student) return;
            const validMemberships = memberships.filter(m => {
                if (m.studentId !== student.id || m.refundAmount) return false;
                const mStart = dayjs(m.startDate).startOf('day');
                const mEnd = dayjs(m.endDate).startOf('day');
                return mEnd.isSameOrAfter(vStart) && mStart.isSameOrBefore(vEnd);
            });
            if (validMemberships.length > 0) {
                const latest = validMemberships.sort((a, b) => dayjs(b.endDate).valueOf() - dayjs(a.endDate).valueOf())[0];
                eligibleIds.push(latest.id);
            }
        });

        setSelectedMembershipIds(eligibleIds);
        setVacationSearchTerm('');
        setShowVacationModal(true);
    }, [students, memberships]);

    const toggleSelectAllVacation = useCallback(() => {
        if (selectedMembershipIds.length === vacationEligibleMembers.length) {
            setSelectedMembershipIds([]);
        } else {
            setSelectedMembershipIds(vacationEligibleMembers.map(item => item.membership.id));
        }
    }, [selectedMembershipIds.length, vacationEligibleMembers]);

    const toggleSelectVacationMember = useCallback((membershipId: string) => {
        setSelectedMembershipIds(prev => 
            prev.includes(membershipId) ? prev.filter(id => id !== membershipId) : [...prev, membershipId]
        );
    }, []);

    const handleVacationSubmit = useCallback(async () => {
        if (!bulkExtendMemberships) {
            alert('일괄 연장 기능을 사용할 수 없습니다.');
            return;
        }
        if (selectedMembershipIds.length === 0) {
            alert('연장할 대상 회원을 최소 1명 이상 선택해주세요.');
            return;
        }
        if (vacationDays <= 0) {
            alert('연장 일수는 1일 이상이어야 합니다.');
            return;
        }

        const confirmMessage = `[스튜디오 방학/휴관 일괄 연장 확인]\n\n` +
            `• 방학 기간: ${vacationStartDate} ~ ${vacationEndDate}\n` +
            `• 연장 일수: +${vacationDays}일\n` +
            `• 연장 사유: ${vacationReason}\n` +
            `• 대상 회원: 총 ${selectedMembershipIds.length}명\n\n` +
            `선택한 회원들의 이용권 만료일을 +${vacationDays}일 연장하시겠습니까?`;

        if (!window.confirm(confirmMessage)) return;

        setIsProcessingVacation(true);
        try {
            const success = await bulkExtendMemberships(selectedMembershipIds, vacationDays, vacationReason);
            if (success) {
                alert(`총 ${selectedMembershipIds.length}명의 회원 이용권이 ${vacationDays}일 연장되었습니다.`);
                setShowVacationModal(false);
            }
        } catch (error) {
            console.error('Vacation extension error:', error);
            alert('연장 처리 중 오류가 발생했습니다.');
        } finally {
            setIsProcessingVacation(false);
        }
    }, [bulkExtendMemberships, selectedMembershipIds, vacationDays, vacationReason, vacationStartDate, vacationEndDate]);

    const [editForm, setEditForm] = useState({
        name: '',
        phone: '',
        passType: '',
        startDate: '',
        endDate: '',
        holdStartDate: '',
        holdEndDate: '',
        paymentDate: '',
    });

    const openEditModal = useCallback((member: Student & { membership?: Membership }) => {
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
            paymentDate: member.membership.paymentDate ? dayjs(member.membership.paymentDate).format('YYYY-MM-DD') : '',
        });
    }, []);

    const handleEditSubmit = useCallback(() => {
        if (!editingMember || !editingMember.membership || !updateStudentAndMembership) return;
        
        const membershipUpdates: Partial<Membership> = {
            passType: editForm.passType as PassType,
            startDate: new Date(editForm.startDate).toISOString(),
            paymentDate: editForm.paymentDate ? new Date(editForm.paymentDate).toISOString() : null as any,
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
    }, [editingMember, editForm, updateStudentAndMembership]);

    const upgradeInfo = useMemo(() => {
        if (!editingMember?.membership) return null;
        const original = editingMember.membership;
        const today = dayjs().tz('Asia/Seoul');
        const startDate = dayjs(original.startDate).tz('Asia/Seoul');
        const endDate = dayjs(original.endDate).tz('Asia/Seoul');

        const totalDays = endDate.diff(startDate, 'day');
        const remainingDays = Math.max(0, endDate.diff(today, 'day'));
        
        const remainingValue = totalDays > 0 ? Math.floor((original.price / totalDays) * remainingDays) : 0;
        const newFullPrice = PASS_PRICES[upgradePassType];
        const upgradeCost = newFullPrice - remainingValue;

        return { remainingValue, upgradeCost };
    }, [editingMember, upgradePassType]);

    const handleUpgrade = useCallback(() => {
        if (!editingMember?.membership || !upgradeMembership) return;
        upgradeMembership(editingMember.membership.id, upgradePassType, upgradePaymentMethod, upgradeCashReceipt);
        setEditingMember(null);
        setShowUpgradeUI(false);
    }, [editingMember, upgradeMembership, upgradePassType, upgradePaymentMethod, upgradeCashReceipt]);

    const activeMembers = useMemo(() => {
        const today = dayjs().startOf('day');
        return students.map(student => {
            if (!student) return null;
            
            const studentMemberships = memberships.filter(m => {
                if (m.studentId !== student.id) return false;
                
                const startDate = dayjs(m.startDate).startOf('day');
                const endDate = dayjs(m.endDate).startOf('day');
                
                // If refunded, show if it's currently within its date range
                if (m.refundAmount) {
                    return (today.isAfter(startDate) || today.isSame(startDate)) && (today.isBefore(endDate) || today.isSame(endDate));
                }

                // Check if currently holding
                if (m.holdStartDate && m.holdEndDate) {
                    const holdStart = dayjs(m.holdStartDate).startOf('day');
                    const holdEnd = dayjs(m.holdEndDate).startOf('day');
                    if ((today.isAfter(holdStart) || today.isSame(holdStart)) && (today.isBefore(holdEnd) || today.isSame(holdEnd))) {
                        return true; 
                    }
                }
                
                // Active if today is between start and end (inclusive)
                return (today.isAfter(startDate) || today.isSame(startDate)) && (today.isBefore(endDate) || today.isSame(endDate));
            });
            
            if (studentMemberships.length === 0) return null;

            // Sort by end date descending to find the latest one
            const latestMembership = studentMemberships.sort((a, b) => 
                dayjs(b.endDate).valueOf() - dayjs(a.endDate).valueOf()
            )[0];
            
            return {
                ...student,
                membership: latestMembership as Membership
            };
        }).filter((s): s is (Student & { membership: Membership }) => s !== null)
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [students, memberships]);

    const filteredMembers = useMemo(() => {
        return activeMembers
            .filter(m => 
                (m.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
                (m.phone || '').includes(searchTerm)
            );
    }, [activeMembers, searchTerm]);

    const exportToExcel = () => {
        const data = filteredMembers.map(m => ({
            '이름': m.name,
            '연락처': m.phone,
            '이용권': m.membership?.passType || '-',
            '시작일': m.membership ? dayjs(m.membership.startDate).format('YYYY-MM-DD') : '-',
            '만료일': m.membership ? dayjs(m.membership.endDate).format('YYYY-MM-DD') : '-',
            '잔여일수': m.membership ? Math.max(0, dayjs(m.membership.endDate).diff(dayjs(), 'day')) : 0,
            '메모': m.memo || '-'
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "유효 회원 목록");
        XLSX.writeFile(workbook, `유효회원목록_${dayjs().format('YYYYMMDD')}.xlsx`);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        const d = dayjs(dateStr);
        return d.isValid() ? d.format('YYYY-MM-DD') : '-';
    };

    const getTotalSessions = (passType: string): number => {
        if (!passType) return 0;
        if (passType.includes('원데이')) return 1;
        if (passType.includes('1주일')) return 5;
        if (passType.includes('임산부 요가')) return 8; // 주 2회 기준 1개월 8회
        
        let base = 0;
        if (passType.includes('주 2회')) base = 8;
        else if (passType.includes('주 3회')) base = 12;
        else if (passType.includes('주 5회')) base = 20;
        
        if (passType.includes('1개월')) return base;
        if (passType.includes('3개월')) return base * 3;
        if (passType.includes('6개월')) return base * 6;
        
        return 0;
    };

    const calculateUsageStatus = (studentId: string, membership: Membership) => {
        if (!membership) return { text: '-', isExceeded: false };
        if (membership.refundAmount) return { text: '환불 완료', isExceeded: false };
        
        const total = getTotalSessions(membership.passType);
        if (total === 0) return { text: '-', isExceeded: false };

        const mStart = dayjs(membership.startDate).startOf('day');
        
        const usedCount = attendance.filter(a => {
            if (a.studentId !== studentId) return false;
            const aDate = dayjs(a.date).startOf('day');
            // Only count attendance on or after membership start date
            return aDate.isSame(mStart) || aDate.isAfter(mStart);
        }).length;

        const remaining = total - usedCount;
        
        if (remaining < 0) {
            return { text: `${usedCount} / ${total} (추가 결제 필요)`, isExceeded: true };
        }
        return { text: `${usedCount} / ${total} (잔여: ${Math.max(0, remaining)}회)`, isExceeded: false };
    };

    const handleMemoSave = (studentId: string, newMemo: string) => {
        updateStudent(studentId, { memo: newMemo });
    };

    const MemberRow = React.memo(({ member }: { member: Student & { membership: Membership } }) => (
        <tr className="hover:bg-gray-50/50 transition-colors">
            <td className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => openEditModal(member)}>
                <div className="font-bold text-indigo-600 hover:underline">{member.name}</div>
                <div className="text-xs text-gray-500">{member.phone}</div>
            </td>
            <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-700">{member.membership?.passType || '없음'}</div>
                {member.membership?.holdStartDate && member.membership?.holdEndDate && (
                    <div className="text-xs font-bold text-amber-500 mt-1">
                        (홀딩기간 {dayjs(member.membership.holdStartDate).format('YY/MM/DD')} ~ {dayjs(member.membership.holdEndDate).format('YY/MM/DD')})
                    </div>
                )}
            </td>
            <td className="px-6 py-4">
                <div className="text-sm text-gray-600">
                    {member.membership ? formatDate(member.membership.endDate) : '-'}
                </div>
            </td>
            <td className="px-6 py-4">
                {(() => {
                    const { text, isExceeded } = calculateUsageStatus(member.id, member.membership);
                    const isRefunded = member.membership?.refundAmount;
                    return (
                        <div className={`text-sm font-bold ${isRefunded ? 'text-gray-400' : isExceeded ? 'text-red-600' : 'text-indigo-600'}`}>
                            {text}
                        </div>
                    );
                })()}
            </td>
            <td className="px-6 py-4">
                <MemoInput 
                    value={member.memo || ''} 
                    onSave={(val) => handleMemoSave(member.id, val)}
                />
            </td>
        </tr>
    ));

    const filteredVacationMembers = useMemo(() => {
        if (!vacationSearchTerm) return vacationEligibleMembers;
        return vacationEligibleMembers.filter(item => 
            (item.student.name || '').toLowerCase().includes(vacationSearchTerm.toLowerCase()) ||
            (item.student.phone || '').includes(vacationSearchTerm)
        );
    }, [vacationEligibleMembers, vacationSearchTerm]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">유효 회원 관리</h2>
                    <p className="text-gray-500 mt-1">현재 유효 회원 총 {activeMembers.length}명</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={openVacationModal}
                        className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl transition-all shadow-sm hover:shadow-md text-sm font-bold active:scale-95"
                    >
                        <span>🏖️</span>
                        <span>방학/휴관 일괄 연장</span>
                    </button>
                    <button 
                        onClick={exportToExcel}
                        className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm text-sm font-medium"
                    >
                        <DownloadIcon className="w-4 h-4" />
                        <span>Excel 내보내기</span>
                    </button>
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="이름 또는 연락처 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none w-60 shadow-sm text-sm"
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
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">이용 현황 (잔여/총)</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">비고 (Memo)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredMembers.map(member => (
                                <MemberRow key={member.id} member={member} />
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-2xl my-8">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-bold text-gray-900">회원 및 이용권 수정</h3>
                            <button onClick={() => { setEditingMember(null); setShowUpgradeUI(false); }} className="text-gray-400 hover:text-gray-600">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex p-1 bg-gray-100 rounded-xl mb-8">
                            <button
                                type="button"
                                onClick={() => setShowUpgradeUI(false)}
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!showUpgradeUI ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
                            >
                                기본 정보 수정
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowUpgradeUI(true)}
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${showUpgradeUI ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
                            >
                                이용권 업그레이드
                            </button>
                        </div>

                        {!showUpgradeUI ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">이름</label>
                                        <input
                                            type="text"
                                            value={editForm.name}
                                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">연락처</label>
                                        <input
                                            type="text"
                                            value={editForm.phone}
                                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">이용권 종류</label>
                                        <select
                                            value={editForm.passType}
                                            onChange={(e) => setEditForm({ ...editForm, passType: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        >
                                            {Object.values(PassType).map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">시작일</label>
                                        <input
                                            type="date"
                                            value={editForm.startDate}
                                            onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">만료일 (직접 수정)</label>
                                        <input
                                            type="date"
                                            value={editForm.endDate}
                                            onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">결제일 (수입 집계 기준)</label>
                                        <input
                                            type="date"
                                            value={editForm.paymentDate}
                                            onChange={(e) => setEditForm({ ...editForm, paymentDate: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100">
                                    <h4 className="text-sm font-bold text-amber-800 mb-4 flex items-center gap-2">
                                        <span>⏸️</span> 이용권 홀딩 (일시정지)
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">홀딩 시작일</label>
                                            <input
                                                type="date"
                                                value={editForm.holdStartDate}
                                                onChange={(e) => setEditForm({ ...editForm, holdStartDate: e.target.value })}
                                                className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">홀딩 종료일</label>
                                            <input
                                                type="date"
                                                value={editForm.holdEndDate}
                                                onChange={(e) => setEditForm({ ...editForm, holdEndDate: e.target.value })}
                                                className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-amber-600 mt-3 font-medium">* 홀딩 기간만큼 만료일이 자동 연장됩니다.</p>
                                </div>

                                <div className="flex gap-4 pt-6">
                                    {deleteStudent && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (window.confirm(`${editingMember.name} 회원을 정말로 삭제하시겠습니까? 관련 모든 멤버십 및 출석 기록이 함께 삭제되며 이 작업은 되돌릴 수 없습니다.`)) {
                                                    deleteStudent(editingMember.id);
                                                    setEditingMember(null);
                                                    setShowUpgradeUI(false);
                                                }
                                            }}
                                            className="px-5 py-4 bg-rose-50 text-rose-600 rounded-2xl font-bold hover:bg-rose-100 transition-all text-sm whitespace-nowrap border border-rose-100 shadow-sm"
                                        >
                                            🗑️ 회원 삭제
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => { setEditingMember(null); setShowUpgradeUI(false); }}
                                        className="flex-1 px-6 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all text-sm"
                                    >
                                        취소
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleEditSubmit}
                                        className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 text-sm"
                                    >
                                        수정 완료
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-sm font-bold text-indigo-800">현재 이용권 정보</h4>
                                        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-md">Active</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-500 text-xs">이용권</p>
                                            <p className="font-bold text-gray-900">{editingMember?.membership?.passType}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-xs">남은 가치 (일할 계산)</p>
                                            <p className="font-bold text-indigo-600">{upgradeInfo?.remainingValue.toLocaleString()}원</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">새로운 이용권 선택</label>
                                        <select
                                            value={upgradePassType}
                                            onChange={(e) => setUpgradePassType(e.target.value as PassType)}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        >
                                            <optgroup label="정규 이용권">
                                                {PASS_OPTIONS.filter(o => !o.value.includes('임산부') && !o.value.includes('원데이') && !o.value.includes('1주일')).map(option => (
                                                    <option key={option.value} value={option.value}>{option.label} - {PASS_PRICES[option.value].toLocaleString()}원</option>
                                                ))}
                                            </optgroup>
                                            <optgroup label="스페셜 클래스">
                                                {PASS_OPTIONS.filter(o => o.value.includes('임산부')).map(option => (
                                                    <option key={option.value} value={option.value}>{option.label} - {PASS_PRICES[option.value].toLocaleString()}원</option>
                                                ))}
                                            </optgroup>
                                            <optgroup label="체험권">
                                                {PASS_OPTIONS.filter(o => o.value.includes('원데이') || o.value.includes('1주일')).map(option => (
                                                    <option key={option.value} value={option.value}>{option.label} - {PASS_PRICES[option.value].toLocaleString()}원</option>
                                                ))}
                                            </optgroup>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">결제 수단</label>
                                            <div className="flex gap-2">
                                                {(['카드', '현금'] as const).map(method => (
                                                    <button
                                                        key={method}
                                                        type="button"
                                                        onClick={() => setUpgradePaymentMethod(method)}
                                                        className={`flex-1 py-3 rounded-xl font-bold border transition-all ${upgradePaymentMethod === method ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-400'}`}
                                                    >
                                                        {method}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        {upgradePaymentMethod === '현금' && (
                                            <div className="flex items-end pb-1">
                                                <label className="flex items-center gap-2 cursor-pointer p-3 bg-amber-50 rounded-xl border border-amber-100 w-full">
                                                    <input
                                                        type="checkbox"
                                                        checked={upgradeCashReceipt}
                                                        onChange={(e) => setUpgradeCashReceipt(e.target.checked)}
                                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span className="text-xs font-bold text-amber-800">현금영수증 발행</span>
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-bold text-emerald-800">최종 업그레이드 결제 금액</span>
                                        <span className="text-2xl font-black text-emerald-600">
                                            {upgradeInfo?.upgradeCost.toLocaleString()}원
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-emerald-600 mt-2 font-medium">
                                        * (새 이용권 가격) - (기존 이용권 남은 가치)로 계산되었습니다.
                                    </p>
                                </div>

                                <div className="flex gap-4 pt-6">
                                    <button
                                        onClick={() => { setEditingMember(null); setShowUpgradeUI(false); }}
                                        className="flex-1 px-6 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                                    >
                                        취소
                                    </button>
                                    <button
                                        onClick={handleUpgrade}
                                        disabled={upgradeInfo?.upgradeCost! < 0}
                                        className="flex-1 px-6 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        업그레이드 확정
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Vacation / Holiday Bulk Extension Modal */}
            {showVacationModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl w-full max-w-3xl my-8 flex flex-col max-h-[92vh]">
                        {/* Modal Header */}
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                    <span>🏖️</span> 스튜디오 방학 / 휴관 일괄 연장
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    지정한 방학 기간에 해당하는 유효 회원들의 이용권 만료일을 자동으로 +일수만큼 연장합니다.
                                </p>
                            </div>
                            <button 
                                onClick={() => !isProcessingVacation && setShowVacationModal(false)}
                                className="text-gray-400 hover:text-gray-600 p-1"
                                disabled={isProcessingVacation}
                            >
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Body (Scrollable) */}
                        <div className="space-y-6 overflow-y-auto pr-1 flex-1">
                            {/* Vacation Period & Days Setup Card */}
                            <div className="p-5 bg-gradient-to-br from-amber-50/80 to-orange-50/60 rounded-2xl border border-amber-200/80 shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                                        <span>📅</span> 방학 기간 및 연장 설정
                                    </h4>
                                    <span className="text-xs font-bold px-2.5 py-1 bg-amber-100/80 text-amber-800 rounded-lg">
                                        자동 계산: +{vacationDays}일
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider mb-1.5">
                                            방학 시작일
                                        </label>
                                        <input
                                            type="date"
                                            value={vacationStartDate}
                                            onChange={(e) => handleVacationDateChange(e.target.value, vacationEndDate)}
                                            className="w-full px-3.5 py-2.5 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider mb-1.5">
                                            방학 종료일
                                        </label>
                                        <input
                                            type="date"
                                            value={vacationEndDate}
                                            onChange={(e) => handleVacationDateChange(vacationStartDate, e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium shadow-sm"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <label className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                                                연장 일수 (+일)
                                            </label>
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5, 7].map(d => (
                                                    <button
                                                        key={d}
                                                        type="button"
                                                        onClick={() => setVacationDays(d)}
                                                        className={`px-1.5 py-0.5 text-[11px] font-bold rounded ${vacationDays === d ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}
                                                    >
                                                        +{d}일
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            <input
                                                type="number"
                                                min="1"
                                                max="365"
                                                value={vacationDays}
                                                onChange={(e) => setVacationDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                                className="w-full px-3.5 py-2.5 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm font-bold text-amber-900 shadow-sm"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider mb-1.5">
                                            연장 사유 (회원 메모에 기록)
                                        </label>
                                        <input
                                            type="text"
                                            value={vacationReason}
                                            onChange={(e) => setVacationReason(e.target.value)}
                                            placeholder="예: 스튜디오 여름 방학 (08/12 ~ 08/14)"
                                            className="w-full px-3.5 py-2.5 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm shadow-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Eligible Members Preview List */}
                            <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-3">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={vacationEligibleMembers.length > 0 && selectedMembershipIds.length === vacationEligibleMembers.length}
                                                onChange={toggleSelectAllVacation}
                                                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                                            />
                                            <span className="text-sm font-bold text-gray-800">
                                                전체 선택 ({selectedMembershipIds.length} / {vacationEligibleMembers.length}명)
                                            </span>
                                        </label>
                                    </div>
                                    <div className="relative">
                                        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="대상 회원 검색..."
                                            value={vacationSearchTerm}
                                            onChange={(e) => setVacationSearchTerm(e.target.value)}
                                            className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-amber-500 w-48"
                                        />
                                    </div>
                                </div>

                                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-inner bg-white max-h-64 overflow-y-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead className="sticky top-0 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200 z-10">
                                            <tr>
                                                <th className="px-4 py-3 w-10 text-center">선택</th>
                                                <th className="px-4 py-3 font-bold text-gray-600">회원 정보</th>
                                                <th className="px-4 py-3 font-bold text-gray-600">이용권</th>
                                                <th className="px-4 py-3 font-bold text-gray-600">기존 만료일</th>
                                                <th className="px-4 py-3 font-bold text-emerald-700">연장 후 만료일</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredVacationMembers.map(({ student, membership, currentEndDate, projectedEndDate }) => {
                                                const isSelected = selectedMembershipIds.includes(membership.id);
                                                return (
                                                    <tr 
                                                        key={membership.id} 
                                                        onClick={() => toggleSelectVacationMember(membership.id)}
                                                        className={`cursor-pointer transition-colors ${isSelected ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-gray-50/50 opacity-60'}`}
                                                    >
                                                        <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleSelectVacationMember(membership.id)}
                                                                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="font-bold text-gray-900">{student.name}</div>
                                                            <div className="text-[11px] text-gray-400">{student.phone}</div>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-gray-600">
                                                            {membership.passType}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-gray-500 font-medium">
                                                            {currentEndDate}
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-md border border-emerald-100">
                                                                {projectedEndDate}
                                                                <span className="text-[10px] text-emerald-600 font-extrabold">+{vacationDays}일</span>
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    {filteredVacationMembers.length === 0 && (
                                        <div className="p-8 text-center text-gray-400 text-xs">
                                            {vacationEligibleMembers.length === 0 
                                                ? '지정한 방학 기간에 해당하는 유효 회원이 없습니다.' 
                                                : '검색 조건에 일치하는 대상 회원이 없습니다.'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex gap-4 pt-6 mt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setShowVacationModal(false)}
                                disabled={isProcessingVacation}
                                className="flex-1 px-6 py-3.5 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all text-sm disabled:opacity-50"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={handleVacationSubmit}
                                disabled={isProcessingVacation || selectedMembershipIds.length === 0}
                                className="flex-[2] px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-orange-100 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isProcessingVacation ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span>일괄 연장 처리 중...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>🏖️</span>
                                        <span>총 {selectedMembershipIds.length}명 회원 만료일 +{vacationDays}일 일괄 연장 실행</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
