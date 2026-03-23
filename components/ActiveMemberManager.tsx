
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { Student, Membership, AttendanceRecord, PassType, Transaction } from '../types';
import { SearchIcon, CloseIcon, DownloadIcon, FinancialsIcon } from './icons';
import { PASS_PRICES } from '../constants';
import * as XLSX from 'xlsx';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Seoul');

interface ActiveMemberManagerProps {
    students: Student[];
    memberships: Membership[];
    attendance: AttendanceRecord[];
    updateStudent: (studentId: string, updates: Partial<Student>) => void;
    updateStudentAndMembership?: (studentId: string, membershipId: string, studentUpdates: Partial<Student>, membershipUpdates: Partial<Membership>) => void;
    upgradeMembership?: (originalMembershipId: string, newPassType: PassType, paymentMethod: '카드' | '현금', cashReceiptIssued: boolean) => void;
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
    upgradeMembership
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingMember, setEditingMember] = useState<(Student & { membership?: Membership }) | null>(null);
    const [showUpgradeUI, setShowUpgradeUI] = useState(false);
    const [upgradePassType, setUpgradePassType] = useState<PassType>(PassType.MONTHLY_3_PER_WEEK);
    const [upgradePaymentMethod, setUpgradePaymentMethod] = useState<'카드' | '현금'>('카드');
    const [upgradeCashReceipt, setUpgradeCashReceipt] = useState(false);

    const [editForm, setEditForm] = useState({
        name: '',
        phone: '',
        passType: '',
        startDate: '',
        endDate: '',
        holdStartDate: '',
        holdEndDate: '',
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
        });
    }, []);

    const handleEditSubmit = useCallback(() => {
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
                if (m.studentId !== student.id || m.refundAmount) return false;
                
                const endDate = dayjs(m.endDate).startOf('day');
                const today = dayjs().startOf('day');
                
                // Check if currently holding
                if (m.holdStartDate && m.holdEndDate) {
                    const holdStart = dayjs(m.holdStartDate).startOf('day');
                    const holdEnd = dayjs(m.holdEndDate).startOf('day');
                    if ((today.isAfter(holdStart) || today.isSame(holdStart)) && (today.isBefore(holdEnd) || today.isSame(holdEnd))) {
                        return true; // Keep in list if holding
                    }
                }
                
                return endDate.isAfter(today) || endDate.isSame(today);
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

    const calculateUsageStatus = (studentId: string, membership: Membership) => {
        if (!membership || !membership.totalSessions) return { text: '-', isExceeded: false };
        
        const usedCount = attendance.filter(a => 
            a.studentId === studentId && 
            dayjs(a.date).isAfter(dayjs(membership.startDate).subtract(1, 'day')) && 
            dayjs(a.date).isBefore(dayjs(membership.endDate).add(1, 'day'))
        ).length;

        const total = membership.totalSessions;
        const remaining = total - usedCount;
        
        if (remaining < 0) {
            return { text: `${usedCount} / ${total} (초과)`, isExceeded: true };
        }
        return { text: `${usedCount} / ${total} (잔여: ${remaining}회)`, isExceeded: false };
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
                    return (
                        <div className={`text-sm font-bold ${isExceeded ? 'text-red-600' : 'text-indigo-600'}`}>
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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">유효 회원 관리</h2>
                    <p className="text-gray-500 mt-1">현재 유효 회원 총 {activeMembers.length}명</p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={exportToExcel}
                        className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm text-sm font-medium"
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
                                    <button
                                        onClick={() => { setEditingMember(null); setShowUpgradeUI(false); }}
                                        className="flex-1 px-6 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                                    >
                                        취소
                                    </button>
                                    <button
                                        onClick={handleEditSubmit}
                                        className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
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
                                            {Object.values(PassType).map(type => (
                                                <option key={type} value={type}>{type} - {PASS_PRICES[type].toLocaleString()}원</option>
                                            ))}
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
        </div>
    );
};
