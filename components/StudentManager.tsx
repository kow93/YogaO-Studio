import React, { useState, useMemo } from 'react';
import { Student, Membership, PassType } from '../types';
import { PASS_OPTIONS, PASS_PRICES } from '../constants';
import { CloseIcon } from './icons';

interface StudentManagerProps {
    students: Student[];
    memberships: Membership[];
    addStudent: (student: Omit<Student, 'id' | 'registrationDate'>, passType: PassType, startDate: string, paymentMethod: '카드' | '현금', cashReceiptIssued: boolean) => void;
    deleteStudent: (studentId: string) => void;
    updateStudentAndMembership: (
        studentId: string,
        updatedStudentData: Partial<Omit<Student, 'id'>>,
        updatedMembershipData: Partial<Omit<Membership, 'id' | 'studentId'>>
    ) => void;
}

const AddStudentModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    addStudent: (student: Omit<Student, 'id' | 'registrationDate'>, passType: PassType, startDate: string, paymentMethod: '카드' | '현금', cashReceiptIssued: boolean) => void;
}> = ({ isOpen, onClose, addStudent }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [passType, setPassType] = useState<PassType>(PassType.MONTHLY_3_PER_WEEK);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState<'카드' | '현금'>('카드');
    const [cashReceiptIssued, setCashReceiptIssued] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name && phone && passType && startDate) {
            addStudent({ name, phone }, passType, startDate, paymentMethod, cashReceiptIssued);
            setName('');
            setPhone('');
            setPassType(PassType.MONTHLY_3_PER_WEEK);
            setStartDate(new Date().toISOString().split('T')[0]);
            setPaymentMethod('카드');
            setCashReceiptIssued(false);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg p-8 shadow-2xl w-full max-w-md m-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">신규 회원 등록</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">이름</label>
                        <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
                    </div>
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">연락처</label>
                        <input type="tel" id="phone" value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="010-1234-5678" required />
                    </div>
                    <div>
                        <label htmlFor="passType" className="block text-sm font-medium text-gray-700">이용권 종류</label>
                        <select id="passType" value={passType} onChange={e => setPassType(e.target.value as PassType)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                            {PASS_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>{option.label} - {PASS_PRICES[option.value].toLocaleString()}원</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">시작일</label>
                        <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">결제 방식</label>
                        <div className="mt-2 flex items-center space-x-4">
                            <label className="flex items-center">
                                <input type="radio" name="paymentMethod" value="카드" checked={paymentMethod === '카드'} onChange={() => setPaymentMethod('카드')} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300" />
                                <span className="ml-2 text-sm text-gray-700">카드</span>
                            </label>
                            <label className="flex items-center">
                                <input type="radio" name="paymentMethod" value="현금" checked={paymentMethod === '현금'} onChange={() => setPaymentMethod('현금')} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300" />
                                <span className="ml-2 text-sm text-gray-700">현금</span>
                            </label>
                        </div>
                    </div>
                    {paymentMethod === '현금' && (
                        <div className="pl-1">
                            <label className="flex items-center">
                                <input type="checkbox" checked={cashReceiptIssued} onChange={e => setCashReceiptIssued(e.target.checked)} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                                <span className="ml-2 text-sm font-medium text-gray-700">현금영수증 발행</span>
                            </label>
                        </div>
                    )}
                    <div className="flex justify-end pt-4">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md mr-2 hover:bg-gray-300">취소</button>
                        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">등록</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const StudentDetailModal: React.FC<{
    student: Student;
    membership: Membership;
    onClose: () => void;
    onSave: (
        studentId: string,
        studentData: Partial<Omit<Student, 'id'>>,
        membershipData: Partial<Omit<Membership, 'id' | 'studentId'>>
    ) => void;
}> = ({ student, membership, onClose, onSave }) => {
    const [name, setName] = useState(student.name);
    const [phone, setPhone] = useState(student.phone);
    const [remarks, setRemarks] = useState(student.remarks || '');
    const [passType, setPassType] = useState(membership.passType);
    const [startDate, setStartDate] = useState(membership.startDate.split('T')[0]);
    const [holdStart, setHoldStart] = useState('');
    const [holdEnd, setHoldEnd] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'카드' | '현금'>(membership.paymentMethod);
    const [cashReceiptIssued, setCashReceiptIssued] = useState(membership.cashReceiptIssued || false);

    if (!student) return null;

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const studentData: Partial<Omit<Student, 'id'>> = {};
        if (name !== student.name) studentData.name = name;
        if (phone !== student.phone) studentData.phone = phone;
        if (remarks !== (student.remarks || '')) studentData.remarks = remarks;

        const membershipData: Partial<Omit<Membership, 'id' | 'studentId'>> = {};
        if (passType !== membership.passType) membershipData.passType = passType;
        if (startDate !== membership.startDate.split('T')[0]) membershipData.startDate = startDate;
        if (paymentMethod !== membership.paymentMethod) membershipData.paymentMethod = paymentMethod;
        if (cashReceiptIssued !== (membership.cashReceiptIssued || false)) membershipData.cashReceiptIssued = cashReceiptIssued;
        
        if (holdStart && holdEnd && new Date(holdEnd) >= new Date(holdStart)) {
            membershipData.holdStartDate = holdStart;
            membershipData.holdEndDate = holdEnd;
        }

        onSave(student.id, studentData, membershipData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg p-8 shadow-2xl w-full max-w-lg m-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">회원 정보 수정</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="p-4 border rounded-md">
                        <h3 className="text-lg font-semibold mb-2 text-gray-700">기본 정보</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">이름</label>
                                <input type="text" id="edit-name" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
                            </div>
                            <div>
                                <label htmlFor="edit-phone" className="block text-sm font-medium text-gray-700">연락처</label>
                                <input type="tel" id="edit-phone" value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
                            </div>
                        </div>
                        <div className="mt-4">
                            <label htmlFor="edit-remarks" className="block text-sm font-medium text-gray-700">비고</label>
                            <textarea id="edit-remarks" value={remarks} onChange={e => setRemarks(e.target.value)} rows={3} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"></textarea>
                        </div>
                    </div>
                    
                    <div className="p-4 border rounded-md">
                        <h3 className="text-lg font-semibold mb-2 text-gray-700">이용권 및 결제 정보</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="edit-passType" className="block text-sm font-medium text-gray-700">이용권 종류</label>
                                <select id="edit-passType" value={passType} onChange={e => setPassType(e.target.value as PassType)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                                    {PASS_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="edit-startDate" className="block text-sm font-medium text-gray-700">시작일</label>
                                <input type="date" id="edit-startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700">결제 방식</label>
                             <div className="mt-2 flex items-center space-x-4">
                                <label className="flex items-center">
                                    <input type="radio" name="paymentMethod-edit" value="카드" checked={paymentMethod === '카드'} onChange={() => setPaymentMethod('카드')} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300" />
                                    <span className="ml-2 text-sm text-gray-700">카드</span>
                                </label>
                                <label className="flex items-center">
                                    <input type="radio" name="paymentMethod-edit" value="현금" checked={paymentMethod === '현금'} onChange={() => setPaymentMethod('현금')} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300" />
                                    <span className="ml-2 text-sm text-gray-700">현금</span>
                                </label>
                            </div>
                        </div>
                        {paymentMethod === '현금' && (
                            <div className="mt-4 pl-1">
                                <label className="flex items-center">
                                    <input type="checkbox" checked={cashReceiptIssued} onChange={e => setCashReceiptIssued(e.target.checked)} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                                    <span className="ml-2 text-sm font-medium text-gray-700">현금영수증 발행</span>
                                </label>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border rounded-md bg-gray-50">
                        <h3 className="text-lg font-semibold mb-2 text-gray-700">이용권 홀딩</h3>
                        <p className="text-sm text-gray-500 mb-3">홀딩 기간을 설정하면 이용권 만료일이 자동으로 연장됩니다.</p>
                        {membership.holdStartDate && <p className="text-sm text-blue-600 mb-3">현재 홀딩: {new Date(membership.holdStartDate).toLocaleDateString('ko-KR')} ~ {membership.holdEndDate ? new Date(membership.holdEndDate).toLocaleDateString('ko-KR') : ''}</p>}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="hold-start" className="block text-sm font-medium text-gray-700">홀딩 시작일</label>
                                <input type="date" id="hold-start" value={holdStart} onChange={e => setHoldStart(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" />
                            </div>
                            <div>
                                <label htmlFor="hold-end" className="block text-sm font-medium text-gray-700">홀딩 종료일</label>
                                <input type="date" id="hold-end" value={holdEnd} onChange={e => setHoldEnd(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md mr-2 hover:bg-gray-300">취소</button>
                        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">저장</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


export const StudentManager: React.FC<StudentManagerProps> = ({ students, memberships, addStudent, deleteStudent, updateStudentAndMembership }) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const studentData = useMemo(() => {
        return students
            .map(student => {
                const membership = memberships.find(m => m.studentId === student.id);
                return { ...student, membership };
            })
            .filter(student => student.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a,b) => a.name.localeCompare(b.name));
    }, [students, memberships, searchTerm]);
    
    const selectedStudentData = useMemo(() => {
        if (!selectedStudentId) return null;
        const student = students.find(s => s.id === selectedStudentId);
        const membership = memberships.find(m => m.studentId === selectedStudentId);
        if (!student || !membership) return null;
        return { student, membership };
    }, [selectedStudentId, students, memberships]);

    const getStatus = (membership: Membership | undefined): { text: string; color: string } => {
        if (!membership) return { text: '이용권 없음', color: 'bg-gray-200 text-gray-800' };
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (membership.holdStartDate && membership.holdEndDate) {
            const holdStart = new Date(membership.holdStartDate);
            const holdEnd = new Date(membership.holdEndDate);
            if (today >= holdStart && today <= holdEnd) {
                return { text: '홀딩중', color: 'bg-blue-200 text-blue-800' };
            }
        }
        
        const end = new Date(membership.endDate);
        end.setHours(0,0,0,0);
        const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { text: '만료됨', color: 'bg-red-200 text-red-800' };
        if (diffDays <= 7) return { text: `${diffDays + 1}일 남음`, color: 'bg-yellow-200 text-yellow-800' };
        return { text: '이용중', color: 'bg-green-200 text-green-800' };
    };
    
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-800">회원 관리</h1>
                <div className="flex gap-2 w-full md:w-auto">
                    <input
                      type="text"
                      placeholder="이름으로 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 w-full md:w-64"
                    />
                    <button onClick={() => setIsAddModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 whitespace-nowrap">
                        + 신규 회원
                    </button>
                </div>
            </div>

            <AddStudentModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} addStudent={addStudent} />

            {selectedStudentData && (
                <StudentDetailModal 
                    student={selectedStudentData.student}
                    membership={selectedStudentData.membership}
                    onClose={() => setSelectedStudentId(null)}
                    onSave={updateStudentAndMembership}
                />
            )}

            <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                        <tr>
                            <th scope="col" className="px-6 py-3">이름</th>
                            <th scope="col" className="px-6 py-3">비고</th>
                            <th scope="col" className="px-6 py-3">이용권</th>
                            <th scope="col" className="px-6 py-3">기간</th>
                            <th scope="col" className="px-6 py-3">상태</th>
                            <th scope="col" className="px-6 py-3">연락처</th>
                            <th scope="col" className="px-6 py-3 text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {studentData.length > 0 ? studentData.map(s => {
                            const status = getStatus(s.membership);
                            return (
                                <tr key={s.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                        <button onClick={() => setSelectedStudentId(s.id)} className="text-indigo-600 hover:text-indigo-800 hover:underline font-semibold">
                                            {s.name}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 truncate max-w-xs">{s.remarks || '-'}</td>
                                    <td className="px-6 py-4">{s.membership?.passType || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{s.membership ? `${new Date(s.membership.startDate).toLocaleDateString()} ~ ${new Date(s.membership.endDate).toLocaleDateString()}` : 'N/A'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                                            {status.text}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{s.phone}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => window.confirm(`${s.name} 회원을 삭제하시겠습니까?`) && deleteStudent(s.id)} className="font-medium text-red-600 hover:underline">삭제</button>
                                    </td>
                                </tr>
                            )
                        }) : (
                            <tr>
                                <td colSpan={7} className="text-center py-10 text-gray-500">등록된 회원이 없습니다.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};