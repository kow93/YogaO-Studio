import React, { useState, useMemo } from 'react';
import { Student, Membership, PassType } from '../types';
import { PASS_OPTIONS, PASS_PRICES } from '../constants';
import { CloseIcon, UploadIcon, DownloadIcon } from './icons';

interface StudentManagerProps {
    students: Student[];
    memberships: Membership[];
    addStudent: (student: Omit<Student, 'id' | 'registrationDate'>, passType: PassType, startDate: string, paymentDate: string, paymentMethod: '카드' | '현금', cashReceiptIssued: boolean) => void;
    addMembership: (studentId: string, passType: PassType, startDate: string, paymentDate: string, paymentMethod: '카드' | '현금', cashReceiptIssued: boolean) => void;
    deleteStudent: (studentId: string) => void;
    updateStudentAndMembership: (
        studentId: string,
        membershipId: string,
        updatedStudentData: Partial<Omit<Student, 'id'>>,
        updatedMembershipData: Partial<Omit<Membership, 'id' | 'studentId'>>
    ) => void;
    bulkExtendMemberships: (days: number, reason: string) => void;
    importStudentsAndMemberships: (data: any[]) => void;
}

const AddStudentModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    addStudent: (student: Omit<Student, 'id' | 'registrationDate'>, passType: PassType, startDate: string, paymentDate: string, paymentMethod: '카드' | '현금', cashReceiptIssued: boolean) => void;
}> = ({ isOpen, onClose, addStudent }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [remarks, setRemarks] = useState('');
    const [passType, setPassType] = useState<PassType>(PassType.MONTHLY_3_PER_WEEK);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState<'카드' | '현금'>('카드');
    const [cashReceiptIssued, setCashReceiptIssued] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name && phone && passType && startDate && paymentDate) {
            addStudent({ name, phone, remarks }, passType, startDate, paymentDate, paymentMethod, cashReceiptIssued);
            setName('');
            setPhone('');
            setRemarks('');
            setPassType(PassType.MONTHLY_3_PER_WEEK);
            setStartDate(new Date().toISOString().split('T')[0]);
            setPaymentDate(new Date().toISOString().split('T')[0]);
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
                        <label htmlFor="remarks" className="block text-sm font-medium text-gray-700">비고</label>
                        <textarea id="remarks" value={remarks} onChange={e => setRemarks(e.target.value)} rows={3} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                    </div>
                    <div>
                        <label htmlFor="passType" className="block text-sm font-medium text-gray-700">이용권 종류</label>
                        <select id="passType" value={passType} onChange={e => setPassType(e.target.value as PassType)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                            {PASS_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>{option.label} - {PASS_PRICES[option.value].toLocaleString()}원</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700">결제일</label>
                            <input type="date" id="paymentDate" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
                        </div>
                        <div>
                            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">이용권 시작일</label>
                            <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
                        </div>
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

const ReregisterForm: React.FC<{
    student: Student;
    latestMembership?: Membership;
    onAddMembership: (studentId: string, passType: PassType, startDate: string, paymentDate: string, paymentMethod: '카드' | '현금', cashReceiptIssued: boolean) => void;
    onCancel: () => void;
}> = ({ student, latestMembership, onAddMembership, onCancel }) => {

    const getDefaultStartDate = () => {
        if (latestMembership) {
            const nextDay = new Date(latestMembership.endDate);
            nextDay.setDate(nextDay.getDate() + 1);
            return nextDay.toISOString().split('T')[0];
        }
        return new Date().toISOString().split('T')[0];
    };

    const [passType, setPassType] = useState<PassType>(PassType.MONTHLY_3_PER_WEEK);
    const [startDate, setStartDate] = useState(getDefaultStartDate());
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState<'카드' | '현금'>('카드');
    const [cashReceiptIssued, setCashReceiptIssued] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddMembership(student.id, passType, startDate, paymentDate, paymentMethod, cashReceiptIssued);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 bg-indigo-50 p-6 rounded-lg border border-indigo-200 mt-6">
            <h3 className="text-xl font-bold text-indigo-800">신규 이용권 등록 (재등록)</h3>
            <div>
                <label htmlFor="rereg-passType" className="block text-sm font-medium text-gray-700">이용권 종류</label>
                <select id="rereg-passType" value={passType} onChange={e => setPassType(e.target.value as PassType)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                    {PASS_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label} - {PASS_PRICES[option.value].toLocaleString()}원</option>
                    ))}
                </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="rereg-paymentDate" className="block text-sm font-medium text-gray-700">결제일</label>
                    <input type="date" id="rereg-paymentDate" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
                </div>
                <div>
                    <label htmlFor="rereg-startDate" className="block text-sm font-medium text-gray-700">이용권 시작일</label>
                    <input type="date" id="rereg-startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">결제 방식</label>
                <div className="mt-2 flex items-center space-x-4">
                    <label className="flex items-center"><input type="radio" name="rereg-paymentMethod" value="카드" checked={paymentMethod === '카드'} onChange={() => setPaymentMethod('카드')} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300" /><span className="ml-2">카드</span></label>
                    <label className="flex items-center"><input type="radio" name="rereg-paymentMethod" value="현금" checked={paymentMethod === '현금'} onChange={() => setPaymentMethod('현금')} className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300" /><span className="ml-2">현금</span></label>
                </div>
            </div>
            {paymentMethod === '현금' && (
                <div className="pl-1"><label className="flex items-center"><input type="checkbox" checked={cashReceiptIssued} onChange={e => setCashReceiptIssued(e.target.checked)} className="h-4 w-4 rounded" /><span className="ml-2 text-sm font-medium">현금영수증 발행</span></label></div>
            )}
            <div className="flex justify-end pt-2">
                <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md mr-2 hover:bg-gray-300">취소</button>
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">추가하기</button>
            </div>
        </form>
    );
};


const StudentDetailModal: React.FC<{
    student: Student;
    membership?: Membership; // latest membership
    allMemberships: Membership[];
    onClose: () => void;
    onSave: (
        studentId: string,
        membershipId: string,
        studentData: Partial<Omit<Student, 'id'>>,
        membershipData: Partial<Omit<Membership, 'id' | 'studentId'>>
    ) => void;
    onAddMembership: (studentId: string, passType: PassType, startDate: string, paymentDate: string, paymentMethod: '카드' | '현금', cashReceiptIssued: boolean) => void;
}> = ({ student, membership, allMemberships, onClose, onSave, onAddMembership }) => {
    const [name, setName] = useState(student.name);
    const [phone, setPhone] = useState(student.phone);
    const [remarks, setRemarks] = useState(student.remarks || '');
    const [passType, setPassType] = useState(membership?.passType || PassType.MONTHLY_3_PER_WEEK);
    const [startDate, setStartDate] = useState(membership ? membership.startDate.split('T')[0] : '');
    const [paymentDate, setPaymentDate] = useState(membership ? (membership.paymentDate || membership.startDate).split('T')[0] : '');
    const [holdStart, setHoldStart] = useState('');
    const [holdEnd, setHoldEnd] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'카드' | '현금'>(membership?.paymentMethod || '카드');
    const [cashReceiptIssued, setCashReceiptIssued] = useState(membership?.cashReceiptIssued || false);
    const [isAddingNew, setIsAddingNew] = useState(false);

    if (!student) return null;

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const studentData: Partial<Omit<Student, 'id'>> = {};
        if (name !== student.name) studentData.name = name;
        if (phone !== student.phone) studentData.phone = phone;
        if (remarks !== (student.remarks || '')) studentData.remarks = remarks;

        const membershipData: Partial<Omit<Membership, 'id' | 'studentId'>> = {};
        if (membership) {
            if (passType !== membership.passType) membershipData.passType = passType;
            if (startDate !== membership.startDate.split('T')[0]) membershipData.startDate = startDate;
            if (paymentDate !== (membership.paymentDate || membership.startDate).split('T')[0]) membershipData.paymentDate = paymentDate;
            if (paymentMethod !== membership.paymentMethod) membershipData.paymentMethod = paymentMethod;
            if (cashReceiptIssued !== (membership.cashReceiptIssued || false)) membershipData.cashReceiptIssued = cashReceiptIssued;
            
            if (holdStart && holdEnd && new Date(holdEnd) >= new Date(holdStart)) {
                membershipData.holdStartDate = holdStart;
                membershipData.holdEndDate = holdEnd;
            }
            onSave(student.id, membership.id, studentData, membershipData);
        } else {
            // This case should ideally not happen if we only allow editing when a membership exists.
            // But as a fallback, we just save student data.
             onSave(student.id, '', studentData, {});
        }
        onClose();
    };
    
    const handleAddMembership = (...args: Parameters<typeof onAddMembership>) => {
        onAddMembership(...args);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg p-8 shadow-2xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">회원 정보 ({student.name})</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2 border-b pb-2">이용권 내역</h3>
                    {allMemberships.length > 0 ? (
                        <ul className="space-y-2 max-h-40 overflow-y-auto pr-2">
                            {allMemberships.map(m => (
                                <li key={m.id} className={`p-2 rounded-md text-sm ${m.id === membership?.id ? 'bg-indigo-100 border border-indigo-300' : 'bg-gray-100'}`}>
                                    <div className="font-semibold">{m.passType}</div>
                                    <div className="text-gray-600">기간: {new Date(m.startDate).toLocaleDateString('ko-KR')} ~ {new Date(m.endDate).toLocaleDateString('ko-KR')}</div>
                                    {m.holdStartDate && <div className="text-blue-600">홀딩: {new Date(m.holdStartDate).toLocaleDateString('ko-KR')} ~ {m.holdEndDate ? new Date(m.holdEndDate).toLocaleDateString('ko-KR') : ''}</div>}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500">등록된 이용권이 없습니다.</p>
                    )}
                </div>

                {!isAddingNew && (
                    <button onClick={() => setIsAddingNew(true)} className="w-full text-center bg-indigo-600 text-white px-4 py-3 rounded-md hover:bg-indigo-700 font-semibold mb-6">
                        + 신규 이용권 추가 (재등록)
                    </button>
                )}

                {isAddingNew ? (
                     <ReregisterForm 
                        student={student} 
                        latestMembership={membership} 
                        onAddMembership={handleAddMembership} 
                        onCancel={() => setIsAddingNew(false)}
                     />
                ) : (
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="p-4 border rounded-md">
                            <h3 className="text-lg font-semibold mb-2 text-gray-700">기본 정보 수정</h3>
                            {/* ... student info fields ... */}
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
                        
                        {membership && (
                            <>
                                <div className="p-4 border rounded-md">
                                    <h3 className="text-lg font-semibold mb-2 text-gray-700">최신 이용권 정보 수정</h3>
                                    {/* ... membership fields ... */}
                                    <div>
                                        <label htmlFor="edit-passType" className="block text-sm font-medium text-gray-700">이용권 종류</label>
                                        <select id="edit-passType" value={passType} onChange={e => setPassType(e.target.value as PassType)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                                            {PASS_OPTIONS.map(option => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                        <div>
                                            <label htmlFor="edit-paymentDate" className="block text-sm font-medium text-gray-700">결제일</label>
                                            <input type="date" id="edit-paymentDate" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
                                        </div>
                                        <div>
                                            <label htmlFor="edit-startDate" className="block text-sm font-medium text-gray-700">이용권 시작일</label>
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
                                    {/* ... hold fields ... */}
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
                            </>
                        )}

                        <div className="flex justify-end pt-4">
                            <button type="button" onClick={onClose} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md mr-2 hover:bg-gray-300">취소</button>
                            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">정보 수정 저장</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

const BulkExtendModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (days: number, reason: string) => void;
}> = ({ isOpen, onClose, onConfirm }) => {
    const [days, setDays] = useState('');
    const [reason, setReason] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numDays = parseInt(days, 10);
        if (!isNaN(numDays) && numDays > 0 && reason.trim()) {
            if (window.confirm(`모든 활성 회원의 이용권을 ${numDays}일 연장하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
                onConfirm(numDays, reason);
                onClose();
            }
        } else {
            alert('유효한 연장 일수와 사유를 입력해주세요.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg p-8 shadow-2xl w-full max-w-md m-4">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">전체 회원 이용권 일괄 연장</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                    만료되지 않았고 홀딩 상태가 아닌 모든 활성 회원의 이용권 만료일이 연장됩니다. 이 작업은 되돌릴 수 없으므로 신중하게 진행해주세요.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="extend-days" className="block text-sm font-medium text-gray-700">연장할 일수</label>
                        <input 
                            type="number" 
                            id="extend-days" 
                            value={days} 
                            onChange={e => setDays(e.target.value)} 
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" 
                            placeholder="예: 3"
                            required 
                        />
                    </div>
                    <div>
                        <label htmlFor="extend-reason" className="block text-sm font-medium text-gray-700">연장 사유</label>
                        <input 
                            type="text" 
                            id="extend-reason" 
                            value={reason} 
                            onChange={e => setReason(e.target.value)} 
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" 
                            placeholder="예: 추석 연휴 휴무"
                            required 
                        />
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md mr-2 hover:bg-gray-300">취소</button>
                        <button type="submit" className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700">연장 실행</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Robust CSV line parser
function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let currentField = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Escaped quote
                currentField += '"';
                i++; // Skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(currentField.trim());
            currentField = '';
        } else {
            currentField += char;
        }
    }
    result.push(currentField.trim()); // Add the last field
    return result;
}


export const StudentManager: React.FC<StudentManagerProps> = ({ students, memberships, addStudent, addMembership, deleteStudent, updateStudentAndMembership, bulkExtendMemberships, importStudentsAndMemberships }) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isBulkExtendModalOpen, setIsBulkExtendModalOpen] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const getStatus = (membership: Membership | undefined): { text: string; color: string } => {
        if (!membership) return { text: '이용권 없음', color: 'bg-gray-200 text-gray-800' };

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = new Date(membership.startDate);
        start.setHours(0, 0, 0, 0);

        // This check must come first.
        if (start > today) {
            const diffDays = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return { text: `시작 ${diffDays}일 전`, color: 'bg-cyan-200 text-cyan-800' };
        }

        if (membership.holdStartDate && membership.holdEndDate) {
            const holdStart = new Date(membership.holdStartDate);
            const holdEnd = new Date(membership.holdEndDate);
            if (today >= holdStart && today <= holdEnd) {
                return { text: '홀딩중', color: 'bg-blue-200 text-blue-800' };
            }
        }

        const end = new Date(membership.endDate);
        end.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { text: '만료됨', color: 'bg-red-200 text-red-800' };
        if (diffDays <= 7) return { text: `${diffDays + 1}일 남음`, color: 'bg-yellow-200 text-yellow-800' };
        return { text: '이용중', color: 'bg-green-200 text-green-800' };
    };

    const studentData = useMemo(() => {
        return students
            .map(student => {
                const studentMemberships = memberships.filter(m => m.studentId === student.id);

                if (studentMemberships.length === 0) {
                    return { ...student, membership: undefined, combinedEndDate: undefined };
                }

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // 1. Find a membership that is currently active.
                const currentMembership = studentMemberships.find(m => {
                    const startDate = new Date(m.startDate);
                    const endDate = new Date(m.endDate);
                    return startDate <= today && endDate >= today;
                });

                let representativeMembership: Membership | undefined;

                if (currentMembership) {
                    representativeMembership = currentMembership;
                } else {
                    // 2. If no current, find the one that starts soonest in the future.
                    const future = studentMemberships
                        .filter(m => new Date(m.startDate) > today)
                        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

                    if (future.length > 0) {
                        representativeMembership = future[0];
                    } else {
                        // 3. If no current or future, find the one that expired most recently.
                        const past = studentMemberships
                            .filter(m => new Date(m.endDate) < today)
                            .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());

                        if (past.length > 0) {
                            representativeMembership = past[0];
                        } else {
                            // Fallback: just take the one that ends last
                            representativeMembership = [...studentMemberships].sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0];
                        }
                    }
                }

                // Calculate combined end date from all non-expired memberships
                let combinedEndDate: string | undefined;
                const nonExpiredMemberships = studentMemberships.filter(m => new Date(m.endDate) >= today);

                if (nonExpiredMemberships.length > 0) {
                    const latestEndDate = nonExpiredMemberships.reduce((latest, current) => {
                        return new Date(current.endDate) > new Date(latest) ? current.endDate : latest;
                    }, nonExpiredMemberships[0].endDate);
                    combinedEndDate = latestEndDate;
                }

                return { ...student, membership: representativeMembership, combinedEndDate };
            })
            .filter(student => student.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [students, memberships, searchTerm]);
    
    const selectedStudentData = useMemo(() => {
        if (!selectedStudentId) return null;
        const student = students.find(s => s.id === selectedStudentId);
        if (!student) return null;
        const studentMemberships = memberships
            .filter(m => m.studentId === selectedStudentId)
            .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
        return { student, allMemberships: studentMemberships, latestMembership: studentMemberships[0] };
    }, [selectedStudentId, students, memberships]);

    const handleExport = () => {
        if (students.length === 0) {
            alert('내보낼 데이터가 없습니다.');
            return;
        }
        
        const headerMapping = {
            student_id: '회원 ID',
            student_name: '이름',
            student_phone: '연락처',
            student_registrationDate: '최초 등록일',
            student_remarks: '비고',
            membership_id: '멤버십 ID',
            membership_passType: '이용권 종류',
            membership_startDate: '이용권 시작일',
            membership_endDate: '이용권 만료일',
            membership_price: '결제 금액',
            membership_paymentDate: '결제일',
            membership_paymentMethod: '결제 방식',
            membership_cashReceiptIssued: '현금영수증 발행',
            membership_holdStartDate: '홀딩 시작일',
            membership_holdEndDate: '홀딩 종료일',
        };
        const englishHeaders = Object.keys(headerMapping);
        const koreanHeaders = Object.values(headerMapping);

        const dataToExport = students.map(student => {
            const studentMemberships = memberships.filter(m => m.studentId === student.id);
            if (studentMemberships.length === 0) {
                 return {
                    student_id: student.id,
                    student_name: student.name,
                    student_phone: student.phone,
                    student_registrationDate: student.registrationDate,
                    student_remarks: student.remarks || '',
                 }
            }
            return studentMemberships.map(membership => ({
                student_id: student.id,
                student_name: student.name,
                student_phone: student.phone,
                student_registrationDate: student.registrationDate,
                student_remarks: student.remarks || '',
                membership_id: membership?.id || '',
                membership_passType: membership?.passType || '',
                membership_startDate: membership?.startDate || '',
                membership_endDate: membership?.endDate || '',
                membership_price: membership?.price === undefined ? '' : membership.price,
                membership_paymentDate: membership?.paymentDate || '',
                membership_paymentMethod: membership?.paymentMethod || '',
                membership_cashReceiptIssued: membership?.cashReceiptIssued || false,
                membership_holdStartDate: membership?.holdStartDate || '',
                membership_holdEndDate: membership?.holdEndDate || '',
            }));
        }).flat();

        const csvRows = dataToExport.map(row => 
            englishHeaders.map(header => {
                let value = row[header as keyof typeof row];
                if (value === null || value === undefined) {
                    return '';
                }
                let stringValue = String(value);
                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                    stringValue = `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            }).join(',')
        );

        const csvContent = "\uFEFF" + [koreanHeaders.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const today = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `yogao_students_${today}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) {
                alert('파일을 읽을 수 없습니다.');
                return;
            }

            try {
                const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
                if (lines.length < 2) {
                    alert('파일에 헤더 외 데이터가 없습니다.');
                    return;
                }
                
                const koreanToEnglishMap: { [key: string]: string } = {
                    '회원 ID': 'student_id',
                    '이름': 'student_name',
                    '연락처': 'student_phone',
                    '최초 등록일': 'student_registrationDate',
                    '비고': 'student_remarks',
                    '멤버십 ID': 'membership_id',
                    '이용권 종류': 'membership_passType',
                    '이용권 시작일': 'membership_startDate',
                    '이용권 만료일': 'membership_endDate',
                    '결제 금액': 'membership_price',
                    '결제일': 'membership_paymentDate',
                    '결제 방식': 'membership_paymentMethod',
                    '현금영수증 발행': 'membership_cashReceiptIssued',
                    '홀딩 시작일': 'membership_holdStartDate',
                    '홀딩 종료일': 'membership_holdEndDate',
                };
                const expectedHeaders = Object.keys(koreanToEnglishMap);
                const headerLine = parseCsvLine(lines[0]).map(h => h.trim().replace(/^\uFEFF/, ''));
                
                const headerIndexMap: { [key: string]: number } = {};
                headerLine.forEach((h, i) => {
                    const englishKey = koreanToEnglishMap[h];
                    if (englishKey) {
                        headerIndexMap[englishKey] = i;
                    }
                });


                const missingHeaders = expectedHeaders.filter(h => !headerLine.includes(h) && h !== '회원 ID' && h !== '멤버십 ID');
                 if (missingHeaders.length > 5) { 
                    alert(`CSV 파일 헤더가 올바르지 않습니다. 내보내기한 파일의 형식을 사용해주세요. (예: ${missingHeaders.slice(0,3).join(', ')} 등 누락)`);
                    return;
                }

                const validData: any[] = [];
                const errorLogs: string[] = [];
                const passTypeValues = Object.values(PassType);

                lines.slice(1).forEach((line, index) => {
                    const values = parseCsvLine(line);
                    const rowObj: { [key: string]: any } = {};
                    
                    Object.keys(headerIndexMap).forEach(englishKey => {
                        const idx = headerIndexMap[englishKey];
                        if (values[idx] !== undefined) {
                            rowObj[englishKey] = values[idx];
                        }
                    });

                    let isValid = true;
                    const rowIndexForError = index + 2;

                    if (!rowObj.student_name || rowObj.student_name.trim() === '') {
                        errorLogs.push(`줄 ${rowIndexForError}: '이름'은 필수 항목입니다.`);
                        isValid = false;
                    }

                    if (rowObj.membership_passType && !passTypeValues.includes(rowObj.membership_passType as PassType)) {
                        errorLogs.push(`줄 ${rowIndexForError}: '${rowObj.membership_passType}'은(는) 유효한 '이용권 종류'가 아닙니다.`);
                        isValid = false;
                    }

                    ['student_registrationDate', 'membership_startDate', 'membership_endDate', 'membership_holdStartDate', 'membership_holdEndDate', 'membership_paymentDate'].forEach(dateKey => {
                        if (rowObj[dateKey] && isNaN(new Date(rowObj[dateKey]).getTime())) {
                            const koreanHeader = Object.keys(koreanToEnglishMap).find(k => koreanToEnglishMap[k] === dateKey);
                            errorLogs.push(`줄 ${rowIndexForError}: '${koreanHeader}'의 날짜 형식이 올바르지 않습니다.`);
                            isValid = false;
                        }
                    });

                    if (rowObj.membership_price && isNaN(Number(rowObj.membership_price))) {
                        errorLogs.push(`줄 ${rowIndexForError}: '결제 금액'은 숫자여야 합니다.`);
                        isValid = false;
                    }

                    if (isValid) {
                        validData.push(rowObj);
                    }
                });

                if (errorLogs.length > 0) {
                    alert(`총 ${errorLogs.length}개의 데이터에서 오류가 발견되어 가져오기에서 제외했습니다.\n\n오류 예시:\n${errorLogs.slice(0, 5).join('\n')}${errorLogs.length > 5 ? '\n...' : ''}`);
                }

                if (validData.length > 0) {
                    importStudentsAndMemberships(validData);
                } else if (errorLogs.length === 0) {
                    alert('가져올 유효한 데이터가 없습니다.');
                }

            } catch (error) {
                console.error("Error parsing CSV:", error);
                alert("CSV 파일을 처리하는 중 오류가 발생했습니다. 파일 형식을 확인해주세요.");
            }
        };
        reader.readAsText(file, 'UTF-8');
        event.target.value = '';
    };
    
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-800">회원 관리</h1>
                <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-start md:justify-end">
                    <input
                      type="text"
                      placeholder="이름으로 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 w-full sm:w-auto md:w-48"
                    />
                    <input type="file" id="csv-import" className="hidden" accept=".csv" onChange={handleImport} />
                    <label htmlFor="csv-import" className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 whitespace-nowrap cursor-pointer inline-flex items-center gap-2">
                        <UploadIcon className="w-5 h-5" /> 가져오기
                    </label>
                    <button onClick={handleExport} className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 whitespace-nowrap inline-flex items-center gap-2">
                       <DownloadIcon className="w-5 h-5" /> 내보내기
                    </button>
                    <button onClick={() => setIsBulkExtendModalOpen(true)} className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 whitespace-nowrap">
                        일괄 연장
                    </button>
                    <button onClick={() => setIsAddModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 whitespace-nowrap">
                        + 신규 회원
                    </button>
                </div>
            </div>

            <AddStudentModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} addStudent={addStudent} />

            <BulkExtendModal
                isOpen={isBulkExtendModalOpen}
                onClose={() => setIsBulkExtendModalOpen(false)}
                onConfirm={bulkExtendMemberships}
            />

            {selectedStudentData && (
                <StudentDetailModal 
                    student={selectedStudentData.student}
                    membership={selectedStudentData.latestMembership}
                    allMemberships={selectedStudentData.allMemberships}
                    onClose={() => setSelectedStudentId(null)}
                    onSave={updateStudentAndMembership}
                    onAddMembership={addMembership}
                />
            )}

            <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 table-fixed">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                        <tr>
                            <th scope="col" className="px-6 py-3 w-[15%]">이름</th>
                            <th scope="col" className="px-6 py-3 w-[25%]">비고</th>
                            <th scope="col" className="px-6 py-3 w-[20%]">이용권</th>
                            <th scope="col" className="px-6 py-3 w-[15%]">기간</th>
                            <th scope="col" className="px-6 py-3 w-[10%]">상태</th>
                            <th scope="col" className="px-6 py-3 w-[10%]">연락처</th>
                            <th scope="col" className="px-6 py-3 text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {studentData.length > 0 ? studentData.map(s => {
                            const status = getStatus(s.membership);
                            return (
                                <tr key={s.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap truncate" title={s.name}>
                                        <button onClick={() => setSelectedStudentId(s.id)} className="text-indigo-600 hover:text-indigo-800 hover:underline font-semibold">
                                            {s.name}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 truncate" title={s.remarks || '-'}>{s.remarks || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap truncate" title={s.membership?.passType || 'N/A'}>{s.membership?.passType || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{s.membership ? `${new Date(s.membership.startDate).toLocaleDateString('ko-KR')} ~ ${new Date(s.combinedEndDate || s.membership.endDate).toLocaleDateString('ko-KR')}` : 'N/A'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                                            {status.text}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap truncate" title={s.phone}>{s.phone}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => {
                                                if (window.confirm(`${s.name} 회원을 삭제하시겠습니까? 관련된 모든 멤버십 및 출석 기록이 함께 삭제됩니다.`)) {
                                                    deleteStudent(s.id);
                                                }
                                            }}
                                            className="font-medium text-red-600 hover:underline"
                                        >
                                            삭제
                                        </button>
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