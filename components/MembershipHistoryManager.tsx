
import React, { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import { Student, Membership, PassType } from '../types';
import { PASS_PRICES } from '../constants';
import { SearchIcon, PlusIcon, FinancialsIcon } from './icons';

interface MembershipHistoryManagerProps {
    students: Student[];
    memberships: Membership[];
    addStudent: (studentData: Omit<Student, 'id' | 'registrationDate'>, passType: PassType, startDate: string, paymentDate: string, paymentMethod: '카드' | '현금', cashReceiptIssued: boolean, discountAmount: number) => void;
    addMembership: (studentId: string, passType: PassType, startDate: string, paymentDate: string, paymentMethod: '카드' | '현금', cashReceiptIssued: boolean, customPrice?: number, discountAmount?: number) => void;
    refundMembership: (membershipId: string, refundAmount: number) => void;
}

export const MembershipHistoryManager: React.FC<MembershipHistoryManagerProps> = ({
    students,
    memberships,
    addStudent,
    addMembership,
    refundMembership
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState<{ id: string, name: string } | null>(null);
    const [refundAmount, setRefundAmount] = useState(0);
    const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

    const formatDate = (dateStr: string | undefined) => {
        if (!dateStr) return '-';
        const d = dayjs(dateStr);
        return d.isValid() ? d.format('YYYY-MM-DD') : '-';
    };

    const groupedHistory = useMemo(() => {
        // Group memberships by studentId using reduce
        const grouped = memberships.reduce((acc, m) => {
            if (!acc[m.studentId]) {
                // Find student from students array
                let student = students.find(s => s.id === m.studentId);
                
                // Fallback to empty student if not found
                if (!student) {
                    student = {
                        id: m.studentId,
                        name: '이름 없음',
                        phone: '',
                        registrationDate: ''
                    };
                }
                
                acc[m.studentId] = {
                    student,
                    memberships: []
                };
            }
            acc[m.studentId].memberships.push(m);
            return acc;
        }, {} as Record<string, { student: Student, memberships: Membership[] }>);

        // Add students who don't have any memberships yet
        students.forEach(student => {
            if (!grouped[student.id]) {
                grouped[student.id] = {
                    student,
                    memberships: []
                };
            }
        });

        // Convert to array and sort
        return Object.values(grouped).map(group => {
            // Sort memberships within each group by date ascending
            group.memberships.sort((a, b) => {
                const dateA = dayjs(a.paymentDate || a.startDate).valueOf();
                const dateB = dayjs(b.paymentDate || b.startDate).valueOf();
                return dateA - dateB;
            });
            return group;
        }).sort((a, b) => (a.student.name || '').localeCompare(b.student.name || ''));
    }, [memberships, students]);

    const filteredGroups = groupedHistory.filter(g => 
        (g.student.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
        (g.student.phone || '').includes(searchTerm)
    );

    const toggleExpand = (studentId: string) => {
        setExpandedStudentId(prev => prev === studentId ? null : studentId);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">멤버십(결제) 관리</h2>
                    <p className="text-gray-500 mt-1">회원별 결제 내역 및 신규 이용권 등록</p>
                </div>
                <div className="flex gap-4">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="회원 이름 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none w-64 shadow-sm"
                        />
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                        <PlusIcon className="w-5 h-5" />
                        신규 등록
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">회원명</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">연락처</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">멤버십 히스토리</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">최근 결제일</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredGroups.map(group => (
                                <React.Fragment key={group.student.id}>
                                    <tr 
                                        onClick={() => toggleExpand(group.student.id)}
                                        className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                                    >
                                        <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-2">
                                            <span className={`transform transition-transform ${expandedStudentId === group.student.id ? 'rotate-90' : ''}`}>▶</span>
                                            {group.student.name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{group.student.phone}</td>
                                        <td className="px-6 py-4 text-right text-sm font-bold text-indigo-600">{group.memberships.length}건</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {formatDate(group.memberships[group.memberships.length - 1]?.paymentDate || group.memberships[group.memberships.length - 1]?.startDate)}
                                        </td>
                                    </tr>
                                    {expandedStudentId === group.student.id && (
                                        <tr>
                                            <td colSpan={4} className="bg-gray-50 p-4">
                                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                                    <table className="w-full text-left">
                                                        <thead className="bg-gray-50 border-b border-gray-100">
                                                            <tr>
                                                                <th className="px-4 py-3 text-xs font-bold text-gray-500">결제일</th>
                                                                <th className="px-4 py-3 text-xs font-bold text-gray-500">이용권</th>
                                                                <th className="px-4 py-3 text-xs font-bold text-gray-500 text-right">금액</th>
                                                                <th className="px-4 py-3 text-xs font-bold text-gray-500">상태</th>
                                                                <th className="px-4 py-3 text-xs font-bold text-gray-500">관리</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {group.memberships.map(item => (
                                                                <tr key={item.id}>
                                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                                        {formatDate(item.paymentDate || item.startDate)}
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <div className="text-sm font-medium text-gray-700">{item.passType}</div>
                                                                        <div className="text-[10px] text-gray-400">
                                                                            {formatDate(item.startDate)} ~ {formatDate(item.endDate)}
                                                                        </div>
                                                                        {item.holdStartDate && item.holdEndDate && (
                                                                            <div className="text-[10px] font-bold text-amber-500 mt-1">
                                                                                (홀딩중 {formatDate(item.holdStartDate)} ~ {formatDate(item.holdEndDate)})
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right">
                                                                        <div className="font-bold text-gray-900">
                                                                            {item.price.toLocaleString()}원
                                                                            {item.discountAmount ? (
                                                                                <span className="ml-2 text-[10px] text-rose-500 font-medium">(-{item.discountAmount.toLocaleString()})</span>
                                                                            ) : null}
                                                                        </div>
                                                                        <div className="text-[10px] text-gray-400">{item.paymentMethod} {item.cashReceiptIssued ? '(현금영수증)' : ''}</div>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        {item.refundAmount ? (
                                                                            <span className="px-2 py-1 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-md border border-rose-100">
                                                                                환불 ({item.refundAmount.toLocaleString()}원)
                                                                            </span>
                                                                        ) : (
                                                                            <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-md border border-emerald-100">
                                                                                결제 완료
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        {!item.refundAmount && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setShowRefundModal({ id: item.id, name: group.student.name });
                                                                                    setRefundAmount(item.price);
                                                                                }}
                                                                                className="text-xs font-bold text-gray-400 hover:text-rose-600 transition-colors"
                                                                            >
                                                                                환불 처리
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <AddMembershipModal 
                    students={students}
                    onClose={() => setShowAddModal(false)}
                    onAddStudent={addStudent}
                    onAddMembership={addMembership}
                />
            )}

            {/* Refund Modal */}
            {showRefundModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 shadow-2xl w-full max-w-md">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">환불 처리</h3>
                        <p className="text-sm text-gray-500 mb-6">{showRefundModal.name} 회원의 이용권 환불 금액을 입력하세요.</p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">환불 금액</label>
                                <input
                                    type="number"
                                    value={refundAmount}
                                    onChange={(e) => setRefundAmount(Number(e.target.value))}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-lg"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setShowRefundModal(null)}
                                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={() => {
                                        refundMembership(showRefundModal.id, refundAmount);
                                        setShowRefundModal(null);
                                    }}
                                    className="flex-1 px-4 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-100"
                                >
                                    환불 확정
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const AddMembershipModal: React.FC<{
    students: Student[];
    onClose: () => void;
    onAddStudent: any;
    onAddMembership: any;
}> = ({ students, onClose, onAddStudent, onAddMembership }) => {
    const [isNewStudent, setIsNewStudent] = useState(true);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [passType, setPassType] = useState(PassType.MONTHLY_3_PER_WEEK);
    const [startDate, setStartDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [paymentDate, setPaymentDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [paymentMethod, setPaymentMethod] = useState<'카드' | '현금'>('카드');
    const [cashReceiptIssued, setCashReceiptIssued] = useState(false);
    const [discountAmount, setDiscountAmount] = useState(0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isNewStudent) {
            onAddStudent({ name, phone }, passType, startDate, paymentDate, paymentMethod, cashReceiptIssued, discountAmount);
        } else {
            onAddMembership(selectedStudentId, passType, startDate, paymentDate, paymentMethod, cashReceiptIssued, undefined, discountAmount);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-bold text-gray-900">신규 이용권 등록</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <PlusIcon className="w-6 h-6 rotate-45" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="flex p-1 bg-gray-100 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setIsNewStudent(true)}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isNewStudent ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
                        >
                            신규 회원
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsNewStudent(false)}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isNewStudent ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
                        >
                            기존 회원 (재등록)
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {isNewStudent ? (
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">이름</label>
                                    <input
                                        required
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">연락처</label>
                                    <input
                                        required
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="010-0000-0000"
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">회원 선택</label>
                                <select
                                    required
                                    value={selectedStudentId}
                                    onChange={(e) => setSelectedStudentId(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="">회원을 선택하세요</option>
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">이용권 종류</label>
                            <select
                                value={passType}
                                onChange={(e) => setPassType(e.target.value as PassType)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                {Object.values(PassType).map(type => (
                                    <option key={type} value={type}>{type} - {PASS_PRICES[type].toLocaleString()}원</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">시작일</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">결제일</label>
                            <input
                                type="date"
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">결제 수단</label>
                            <div className="flex gap-2">
                                {(['카드', '현금'] as const).map(method => (
                                    <button
                                        key={method}
                                        type="button"
                                        onClick={() => setPaymentMethod(method)}
                                        className={`flex-1 py-3 rounded-xl font-bold border transition-all ${paymentMethod === method ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-400'}`}
                                    >
                                        {method}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">할인 금액</label>
                            <input
                                type="number"
                                value={discountAmount}
                                onChange={(e) => setDiscountAmount(Number(e.target.value))}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-rose-500"
                                placeholder="0"
                            />
                        </div>

                        {paymentMethod === '현금' && (
                            <div className="col-span-2 flex items-center gap-3 bg-amber-50 p-4 rounded-xl border border-amber-100">
                                <input
                                    type="checkbox"
                                    id="cashReceipt"
                                    checked={cashReceiptIssued}
                                    onChange={(e) => setCashReceiptIssued(e.target.checked)}
                                    className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor="cashReceipt" className="text-sm font-bold text-amber-800">현금영수증 발행 완료</label>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4 pt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                        >
                            등록 완료
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
