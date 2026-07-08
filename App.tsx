
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Student, Membership, AttendanceRecord, ViewType, PassType, Expense, ClassSchedule, Transaction, AttendanceFormatted } from './types';
import { PASS_PRICES, PASS_DURATIONS, DEFAULT_SCHEDULE, calculateEndDate } from './constants';
import { Dashboard } from './components/Dashboard';
import { AttendanceManager } from './components/AttendanceManager';
import { ExpenseManager } from './components/ExpenseManager';
import { ActiveMemberManager } from './components/ActiveMemberManager';
import { MembershipHistoryManager } from './components/MembershipHistoryManager';
import { DashboardIcon, StudentsIcon, AttendanceIcon, ExpenseIcon, FinancialsIcon } from './components/icons';
import { FinancialReport } from './components/FinancialReport';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Seoul');

const parseAmount = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const parsed = parseInt(String(val).replace(/[^0-9-]/g, ''), 10);
    return isNaN(parsed) ? 0 : parsed;
};

const parseDate = (val: any): string => {
    if (!val) return dayjs().toISOString();
    const d = dayjs(val);
    return d.isValid() ? d.toISOString() : dayjs().toISOString();
};

const formatPhone = (val: any): string => {
    if (!val) return '';
    let str = String(val).trim();
    // Ensure it starts with 0 if it's a valid Korean mobile number format but missing leading 0
    if (str.length === 10 && (str.startsWith('10') || str.startsWith('11'))) {
        str = '0' + str;
    }
    return str;
};

const App: React.FC = () => {
    const [view, setView] = useState<ViewType>('dashboard');
    
    const [students, setStudents] = useState<Student[]>([]);
    const [memberships, setMemberships] = useState<Membership[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [attendanceFormatted, setAttendanceFormatted] = useState<AttendanceFormatted[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [schedule, setSchedule] = useState<ClassSchedule[]>(DEFAULT_SCHEDULE);
    const [submittingKeys, setSubmittingKeys] = useState<string[]>([]);
    const pendingPromises = useRef<Record<string, Promise<any>>>({});
    const attendanceRef = useRef<AttendanceRecord[]>([]);
    attendanceRef.current = attendance;

    const supabase = (window as any)._supabase;

    const fetchData = useCallback(async () => {
        if (!supabase) return;

        const fetchAllWithPagination = async (table: string) => {
            let allData: any[] = [];
            let offset = 0;
            const limit = 1000;
            let done = false;
            while (!done) {
                const { data, error } = await supabase
                    .from(table)
                    .select('*')
                    .range(offset, offset + limit - 1);
                
                if (error) {
                    if (error.code === 'PGRST205') {
                        console.warn(`Table '${table}' is missing (PGRST205). Returning null gracefully.`);
                        return null;
                    }
                    console.error(`Error pagination fetching ${table}:`, {
                        code: error.code,
                        message: error.message,
                        details: error.details,
                        hint: error.hint,
                        errorObject: error
                    });
                    return null;
                }
                
                if (data && data.length > 0) {
                    allData = [...allData, ...data];
                    if (data.length < limit) {
                        done = true;
                    } else {
                        offset += limit;
                    }
                } else {
                    done = true;
                }
            }
            return allData;
        };

        try {
            const [
                studentsData,
                membershipsData,
                attendanceData,
                attendanceFormattedData,
                expensesData,
                transactionsData,
                classesData
            ] = await Promise.all([
                fetchAllWithPagination('student'),
                fetchAllWithPagination('membership'),
                fetchAllWithPagination('attendance'),
                fetchAllWithPagination('attendance_formatted'),
                fetchAllWithPagination('expense'),
                fetchAllWithPagination('transaction_history'),
                fetchAllWithPagination('classes')
            ]);
            
            if (studentsData) {
                const mappedStudents = studentsData.map((s: any) => ({
                    ...s,
                    id: s.student_id || s.id,
                    phone: s.phone ? String(s.phone).padStart(11, '0') : '',
                    registrationDate: s.registration_date || s.registrationDate
                }));
                setStudents(mappedStudents);
            }
            if (membershipsData) {
                const mapped = membershipsData.map((m: any) => ({
                    id: m.id,
                    studentId: m.student_id || m.studentId,
                    passType: m.pass_type || m.passType,
                    startDate: m.start_date || m.startDate,
                    endDate: m.end_date || m.endDate,
                    price: m.price,
                    discountAmount: m.discount_amount || m.discountAmount,
                    refundAmount: m.refund_amount || m.refundAmount,
                    paymentDate: m.payment_date || m.paymentDate,
                    holdStartDate: m.hold_start_date || m.holdStartDate,
                    holdEndDate: m.hold_end_date || m.holdEndDate,
                    totalSessions: m.total_sessions || m.totalSessions,
                    paymentMethod: m.payment_method || m.paymentMethod,
                    cashReceiptIssued: m.cash_receipt_issued || m.cashReceiptIssued,
                }));
                setMemberships(mapped);
            }
            if (attendanceData) {
                const mapped = attendanceData.map((a: any) => ({
                    id: a.attendance_id || a.id,
                    studentId: a.student_id || a.studentId,
                    studentName: a.name || a['이름'] || a.studentName,
                    studentPhone: a.phone || a['연락처'] || a.studentPhone,
                    classId: a.class_id || a.classId,
                    date: a.attendance_date || a['출석 날짜'] || a.date,
                    classTime: a.class_info || a['수업 시간 정보'] || a.classTime,
                }));
                setAttendance(mapped);
            }
            if (attendanceFormattedData) {
                setAttendanceFormatted(attendanceFormattedData);
            }
            if (expensesData) {
                const mappedExpenses = expensesData.map((e: any) => ({
                    id: e.id,
                    date: e.날짜 || e.date,
                    category: e.분류 || e.category,
                    description: e.내용 || e.description,
                    amount: typeof (e.금액 || e.amount) === 'string' 
                        ? Number((e.금액 || e.amount).replace(/[^0-9.-]+/g,"")) 
                        : Number(e.금액 || e.amount),
                    transactionId: e.transaction_id || e.transactionId
                }));
                setExpenses(mappedExpenses);
            }
            if (transactionsData) {
                const mapped = transactionsData.map((t: any) => ({
                    id: t.id,
                    type: t.type,
                    category: t.category,
                    amount: t.amount,
                    date: t.date,
                    description: t.description,
                    studentId: t.student_id,
                    membershipId: t.membership_id
                }));
                setTransactions(mapped);
            }
            if (classesData) {
                const mappedClasses = classesData.map((c: any) => ({
                    id: c.id,
                    dayOfWeek: c.day_of_week || c.dayOfWeek,
                    startTime: c.start_time || c.startTime,
                    endTime: c.end_time || c.endTime,
                    className: c.class_name || c.className,
                    color: c.color
                }));
                setSchedule(mappedClasses);
            }
        } catch (err) {
            console.error("fetchData 중 치명적인 오류 발생:", err);
        }
    }, [supabase]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const addStudent = useCallback(async (
        studentData: Omit<Student, 'id' | 'registrationDate'>, 
        passType: PassType, 
        startDateStr: string, 
        paymentDateStr: string, 
        paymentMethod: '카드' | '현금', 
        cashReceiptIssued: boolean,
        discountAmount: number = 0,
        endDateStr?: string
    ) => {
        const studentId = crypto.randomUUID();
        const registrationDate = dayjs().toISOString();
        const newStudent: Student = { 
            ...studentData, 
            phone: formatPhone(studentData.phone),
            id: studentId, 
            registrationDate 
        };
        
        const startDate = dayjs(parseDate(startDateStr));
        const endDate = endDateStr ? dayjs(endDateStr) : dayjs(calculateEndDate(startDate.toDate(), passType));

        const newMembership: Membership = {
            id: crypto.randomUUID(),
            studentId,
            passType,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            price: PASS_PRICES[passType] - discountAmount,
            discountAmount,
            paymentDate: dayjs(parseDate(paymentDateStr)).toISOString(),
            paymentMethod,
            cashReceiptIssued: paymentMethod === '현금' ? cashReceiptIssued : false,
        };

        const newTransaction: Transaction = {
            id: crypto.randomUUID(),
            type: 'Income',
            category: '멤버십',
            amount: newMembership.price,
            date: newMembership.paymentDate || registrationDate,
            description: `신규 멤버십: ${newMembership.passType}`,
            studentId: studentId,
            membershipId: newMembership.id,
            registrationType: 'New'
        };

        setStudents(prev => [...prev, newStudent]);
        setMemberships(prev => [...prev, newMembership]);
        setTransactions(prev => [...prev, newTransaction]);

        if (supabase) {
            const { error: studentError } = await supabase.from('student').insert([{
                student_id: newStudent.id,
                name: newStudent.name,
                phone: String(newStudent.phone).replace(/[^0-9]/g, '').padStart(11, '0'),
                registration_date: newStudent.registrationDate,
                identification: newStudent.id,
                memo: newStudent.notes || ''
            }]);
            if (studentError) {
                alert("학생 저장 중 오류가 발생했습니다: " + studentError.message);
                console.error(studentError);
            }

            const { error: membershipError } = await supabase.from('membership').insert([{
                id: newMembership.id,
                identification: newStudent.id,
                student_id: newMembership.studentId,
                pass_type: newMembership.passType,
                start_date: newMembership.startDate,
                end_date: newMembership.endDate,
                name: newStudent.name,
                phone: String(newStudent.phone).replace(/[^0-9]/g, '').padStart(11, '0'),
                price: newMembership.price,
                payment_method: newMembership.paymentMethod,
                cash_receipt_issued: newMembership.cashReceiptIssued,
                payment_date: newMembership.paymentDate,
                refund_amount: newMembership.refundAmount || null
            }]);
            if (membershipError) {
                alert("멤버십 저장 중 오류가 발생했습니다: " + membershipError.message);
                console.error(membershipError);
            }

            // Insert transaction
            await supabase.from('transaction_history').insert([{
                id: newTransaction.id,
                type: newTransaction.type,
                category: newTransaction.category,
                amount: newTransaction.amount,
                date: newTransaction.date,
                description: newTransaction.description,
                student_id: newTransaction.studentId,
                membership_id: newTransaction.membershipId,
                registration_type: newTransaction.registrationType
            }]);
        }
    }, [supabase, students]);

    const addMembership = useCallback(async (
        studentId: string, 
        passType: PassType, 
        startDateStr: string, 
        paymentDateStr: string, 
        paymentMethod: '카드' | '현금', 
        cashReceiptIssued: boolean,
        customPrice?: number,
        discountAmount: number = 0,
        endDateStr?: string
    ) => {
        const startDate = dayjs(parseDate(startDateStr));
        const endDate = endDateStr ? dayjs(endDateStr) : dayjs(calculateEndDate(startDate.toDate(), passType));

        let price = customPrice !== undefined ? parseAmount(customPrice) : PASS_PRICES[passType];
        
        const studentMemberships = memberships.filter(m => m.studentId === studentId);
        const hasPreviousMembership = studentMemberships.length > 0;
        const lastMembership = studentMemberships.sort((a, b) => dayjs(b.endDate).valueOf() - dayjs(a.endDate).valueOf())[0];

        if (customPrice === undefined) {
            const isNewPassShortTerm = passType === PassType.ONE_DAY || passType === PassType.ONE_WEEK;
            const isPrevPassShortTerm = lastMembership && (lastMembership.passType === PassType.ONE_DAY || lastMembership.passType === PassType.ONE_WEEK);

            if (hasPreviousMembership && !isNewPassShortTerm && !isPrevPassShortTerm) {
                price -= 10000;
            }
        }

        const finalPrice = price - discountAmount;

        const newMembership: Membership = {
            id: crypto.randomUUID(),
            studentId,
            passType,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            price: finalPrice,
            discountAmount,
            paymentDate: dayjs(parseDate(paymentDateStr)).toISOString(),
            paymentMethod,
            cashReceiptIssued: paymentMethod === '현금' ? cashReceiptIssued : false,
        };

        const newTransaction: Transaction = {
            id: crypto.randomUUID(),
            type: 'Income',
            category: '멤버십',
            amount: newMembership.price,
            date: newMembership.paymentDate || newMembership.startDate,
            description: `${hasPreviousMembership ? '재등록' : '신규'} 멤버십: ${newMembership.passType}`,
            studentId: studentId,
            membershipId: newMembership.id,
            registrationType: hasPreviousMembership ? 'Renewal' : 'New'
        };

        setMemberships(prev => [...prev, newMembership]);
        setTransactions(prev => [...prev, newTransaction]);

        if (supabase) {
            const student = students.find(s => s.id === newMembership.studentId);
            const { error } = await supabase.from('membership').insert([{
                id: newMembership.id,
                identification: student?.id || newMembership.studentId,
                student_id: newMembership.studentId,
                pass_type: newMembership.passType,
                start_date: newMembership.startDate,
                end_date: newMembership.endDate,
                name: student?.name || '',
                phone: student ? String(student.phone).replace(/[^0-9]/g, '').padStart(11, '0') : '',
                price: newMembership.price,
                payment_method: newMembership.paymentMethod,
                cash_receipt_issued: newMembership.cashReceiptIssued,
                payment_date: newMembership.paymentDate,
                refund_amount: newMembership.refundAmount || null
            }]);
            if (error) {
                alert("멤버십 저장 중 오류가 발생했습니다: " + error.message);
                console.error(error);
            }

            // Insert transaction
            await supabase.from('transaction_history').insert([{
                id: newTransaction.id,
                type: newTransaction.type,
                category: newTransaction.category,
                amount: newTransaction.amount,
                date: newTransaction.date,
                description: newTransaction.description,
                student_id: newTransaction.studentId,
                membership_id: newTransaction.membershipId,
                registration_type: newTransaction.registrationType
            }]);
        }
    }, [memberships, supabase, students]);

    const upgradeMembership = useCallback(async (originalMembershipId: string, newPassType: PassType, paymentMethod: '카드' | '현금', cashReceiptIssued: boolean) => {
        const original = memberships.find(m => m.id === originalMembershipId);
        if (!original) return;

        const today = dayjs().tz('Asia/Seoul');
        const startDate = dayjs(original.startDate).tz('Asia/Seoul');
        const endDate = dayjs(original.endDate).tz('Asia/Seoul');

        const totalDays = endDate.diff(startDate, 'day');
        const remainingDays = Math.max(0, endDate.diff(today, 'day'));
        
        const remainingValue = totalDays > 0 ? Math.floor((original.price / totalDays) * remainingDays) : 0;
        const newFullPrice = PASS_PRICES[newPassType];
        const upgradeCost = newFullPrice - remainingValue;

        if (upgradeCost < 0) {
            alert("변경하려는 이용권의 가격이 현재 이용권의 남은 가치보다 저렴합니다. 업그레이드는 더 높은 가격의 이용권으로만 가능합니다.");
            return;
        }

        const paymentDateStr = today.toISOString();
        
        const updatedOriginal = {
            ...original,
            status: 'Upgraded' as const,
        };

        const startBase = dayjs(original.endDate).isAfter(today) 
                        ? dayjs(original.endDate) 
                        : today;
        const newEndDate = calculateEndDate(startBase.toDate(), newPassType);

        const newMembership: Membership = {
            id: crypto.randomUUID(),
            studentId: original.studentId,
            passType: newPassType,
            startDate: today.format('YYYY-MM-DD'),
            endDate: dayjs(newEndDate).format('YYYY-MM-DD'),
            price: upgradeCost,
            paymentDate: paymentDateStr,
            paymentMethod,
            cashReceiptIssued: paymentMethod === '현금' ? cashReceiptIssued : false,
            status: 'Active' as const
        };

        const newTransaction: Transaction = {
            id: crypto.randomUUID(),
            type: 'Income',
            category: '멤버십 업그레이드',
            amount: upgradeCost,
            date: paymentDateStr,
            description: `${original.passType} -> ${newPassType} 업그레이드`,
            studentId: original.studentId,
            membershipId: newMembership.id,
            registrationType: 'Renewal'
        };

        setMemberships(prev => prev.map(m => m.id === originalMembershipId ? updatedOriginal : m).concat(newMembership));
        setTransactions(prev => [...prev, newTransaction]);
        alert(`이용권이 성공적으로 업그레이드 되었습니다. 결제 금액: ${upgradeCost.toLocaleString()}원`);

        if (supabase) {
            // Update old membership status
            await supabase.from('membership').update({ status: 'Upgraded' }).eq('id', originalMembershipId);
            
            // Insert new membership
            const student = students.find(s => s.id === newMembership.studentId);
            await supabase.from('membership').insert([{
                id: newMembership.id,
                identification: student?.id || newMembership.studentId,
                student_id: newMembership.studentId,
                pass_type: newMembership.passType,
                start_date: newMembership.startDate,
                end_date: newMembership.endDate,
                name: student?.name || '',
                phone: student ? String(student.phone).replace(/[^0-9]/g, '').padStart(11, '0') : '',
                price: newMembership.price,
                payment_date: newMembership.paymentDate,
                payment_method: newMembership.paymentMethod,
                cash_receipt_issued: newMembership.cashReceiptIssued,
                status: 'Active'
            }]);

            // Insert transaction
            await supabase.from('transaction_history').insert([{
                id: newTransaction.id,
                type: newTransaction.type,
                category: newTransaction.category,
                amount: newTransaction.amount,
                date: newTransaction.date,
                description: newTransaction.description,
                student_id: newTransaction.studentId,
                membership_id: newTransaction.membershipId,
                registration_type: newTransaction.registrationType
            }]);
        }
    }, [memberships, students, supabase]);

    const deleteStudent = useCallback(async (studentIdToDelete: string) => {
        setStudents(prevStudents => prevStudents.filter(student => student.id !== studentIdToDelete));
        setMemberships(prevMemberships => prevMemberships.filter(membership => membership.studentId !== studentIdToDelete));
        setAttendance(prevAttendance => prevAttendance.filter(record => record.studentId !== studentIdToDelete));

        if (supabase) {
            const { error: sError } = await supabase.from('student').delete().eq('student_id', studentIdToDelete);
            if (sError) {
                alert("학생 삭제 중 오류가 발생했습니다: " + sError.message);
                console.error(sError);
            }
            const { error: mError } = await supabase.from('membership').delete().eq('student_id', studentIdToDelete);
            if (mError) {
                console.error(mError);
            }
            const { error: aError } = await supabase.from('attendance').delete().eq('student_id', studentIdToDelete);
            if (aError) {
                console.error(aError);
            }
        }
    }, [supabase]);
    
    const updateStudentAndMembership = useCallback(async (
        studentId: string,
        membershipId: string,
        updatedStudentData: Partial<Omit<Student, 'id'>>,
        updatedMembershipData: Partial<Omit<Membership, 'id' | 'studentId'>>
    ) => {
        setStudents(prev => prev.map(s => s.id === studentId ? { ...s, ...updatedStudentData } : s));
        
        let newFullMembershipData: Membership | undefined;

        if (membershipId) {
            const m = memberships.find(m => m.id === membershipId);
            if (m) {
                newFullMembershipData = { ...m, ...updatedMembershipData };

                if (updatedMembershipData.endDate) {
                     newFullMembershipData.endDate = new Date(updatedMembershipData.endDate).toISOString();
                } else {
                    const startDate = new Date(newFullMembershipData.startDate);
                    const passType = newFullMembershipData.passType;
                    const baseEndDate = calculateEndDate(startDate, passType);

                    let finalEndDate = baseEndDate;
                    if (newFullMembershipData.holdStartDate && newFullMembershipData.holdEndDate) {
                        const holdStart = new Date(newFullMembershipData.holdStartDate);
                        const holdEnd = new Date(newFullMembershipData.holdEndDate);
                        if (holdEnd >= holdStart) {
                            const holdDuration = Math.ceil((holdEnd.getTime() - holdStart.getTime()) / (1000 * 3600 * 24)) + 1;
                            finalEndDate = new Date(baseEndDate.getTime());
                            finalEndDate.setDate(baseEndDate.getDate() + holdDuration);
                        }
                    }
                    newFullMembershipData.endDate = finalEndDate.toISOString();
                }
                
                if (updatedMembershipData.passType) {
                     newFullMembershipData.price = PASS_PRICES[newFullMembershipData.passType];
                }

                if (newFullMembershipData.paymentMethod === '카드') {
                    newFullMembershipData.cashReceiptIssued = false;
                }

                setMemberships(prev => prev.map(m => m.id === membershipId ? newFullMembershipData! : m));
            }
        }

        if (supabase) {
            if (Object.keys(updatedStudentData).length > 0) {
                const mappedStudentData: any = { ...updatedStudentData };
                if (updatedStudentData.phone) {
                    mappedStudentData.phone = String(updatedStudentData.phone).replace(/[^0-9]/g, '').padStart(11, '0');
                }
                if (updatedStudentData.notes) {
                    mappedStudentData.memo = updatedStudentData.notes;
                    delete mappedStudentData.notes;
                }
                const { error } = await supabase.from('student').update(mappedStudentData).eq('student_id', studentId);
                if (error) {
                    alert("학생 정보 수정 중 오류가 발생했습니다: " + error.message);
                    console.error(error);
                }
            }
            if (newFullMembershipData) {
                const mappedMembershipData = {
                    pass_type: newFullMembershipData.passType,
                    start_date: newFullMembershipData.startDate,
                    end_date: newFullMembershipData.endDate,
                    price: newFullMembershipData.price,
                    hold_start_date: newFullMembershipData.holdStartDate || null,
                    hold_end_date: newFullMembershipData.holdEndDate || null,
                    payment_method: newFullMembershipData.paymentMethod,
                    cash_receipt_issued: newFullMembershipData.cashReceiptIssued,
                    refund_amount: newFullMembershipData.refundAmount || null,
                    payment_date: newFullMembershipData.paymentDate || null
                };
                const { error } = await supabase.from('membership').update(mappedMembershipData).eq('id', membershipId);
                if (error) {
                    alert("멤버십 정보 수정 중 오류가 발생했습니다: " + error.message);
                    console.error(error);
                }
            }
        }
    }, [memberships, supabase]);

    const bulkExtendMemberships = useCallback(async (days: number, reason: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
    
        const studentIdsToUpdate = new Set(
            memberships
                .filter(m => {
                    const endDate = new Date(m.endDate);
                    endDate.setHours(0, 0, 0, 0);
                    const isHolding = m.holdStartDate && m.holdEndDate && today >= new Date(m.holdStartDate) && today <= new Date(m.holdEndDate);
                    return endDate >= today && !isHolding;
                })
                .map(m => m.studentId)
        );

        if (studentIdsToUpdate.size === 0) {
            alert(`연장할 활성 회원이 없습니다.`);
            return;
        }
        
        alert(`${studentIdsToUpdate.size}명의 활성 회원 이용권이 ${days}일 연장되었습니다.`);

        const updatedStudents: Student[] = [];
        const updatedMemberships: Membership[] = [];

        setStudents(prevStudents =>
            prevStudents.map(s => {
                if (studentIdsToUpdate.has(s.id)) {
                    const extensionRemark = `[${new Date().toLocaleDateString('ko-KR')}] "${reason}" 사유로 ${days}일 연장.`;
                    const newNotes = s.notes ? `${s.notes}\n${extensionRemark}` : extensionRemark;
                    const updatedStudent = { ...s, notes: newNotes };
                    updatedStudents.push(updatedStudent);
                    return updatedStudent;
                }
                return s;
            })
        );

        setMemberships(prevMemberships => prevMemberships.map(m => {
            if (studentIdsToUpdate.has(m.studentId)) {
                const newEndDate = new Date(m.endDate);
                newEndDate.setDate(newEndDate.getDate() + days);
                const updatedMembership = { ...m, endDate: newEndDate.toISOString() };
                updatedMemberships.push(updatedMembership);
                return updatedMembership;
            }
            return m;
        }));

        if (supabase) {
            for (const s of updatedStudents) {
                const { error } = await supabase.from('student').update({ memo: s.notes }).eq('student_id', s.id);
                if (error) console.error(error);
            }
            for (const m of updatedMemberships) {
                const { error } = await supabase.from('membership').update({ end_date: m.endDate }).eq('id', m.id);
                if (error) console.error(error);
            }
        }
    }, [memberships, supabase]);

    const importStudentsAndMemberships = useCallback(async (data: any[]) => {
        let addedStudentsCount = 0;
        let addedMembershipsCount = 0;

        const newStudents: Student[] = [];
        const newMemberships: Membership[] = [];

        setStudents(prevStudents => {
            const updatedStudents = [...prevStudents];
            data.forEach(item => {
                if (!item.student_id || !item.student_name) return;
                const exists = updatedStudents.some(s => s.id === item.student_id);
                if (!exists) {
                    const newStudent = {
                        id: item.student_id,
                        name: item.student_name,
                        phone: item.student_phone,
                        registrationDate: item.student_registrationDate || new Date().toISOString(),
                        notes: item.student_notes || item.student_remarks
                    };
                    updatedStudents.push(newStudent);
                    newStudents.push(newStudent);
                    addedStudentsCount++;
                }
            });
            return updatedStudents;
        });

        setMemberships(prevMemberships => {
            const updatedMemberships = [...prevMemberships];
            data.forEach(item => {
                if (!item.membership_id) return;
                 const exists = updatedMemberships.some(m => m.id === item.membership_id);
                 if (!exists && item.membership_passType) {
                     const newMembership = {
                         id: item.membership_id,
                         studentId: item.student_id,
                         passType: item.membership_passType,
                         startDate: item.membership_startDate,
                         endDate: item.membership_endDate,
                         price: Number(item.membership_price),
                         paymentDate: item.membership_paymentDate,
                         paymentMethod: item.membership_paymentMethod,
                         cashReceiptIssued: item.membership_cashReceiptIssued === 'true' || item.membership_cashReceiptIssued === true,
                         holdStartDate: item.membership_holdStartDate || undefined,
                         holdEndDate: item.membership_holdEndDate || undefined,
                     };
                     updatedMemberships.push(newMembership);
                     newMemberships.push(newMembership);
                     addedMembershipsCount++;
                 }
            });
            return updatedMemberships;
        });
        alert(`데이터 가져오기 완료: 학생 ${addedStudentsCount}명, 이용권 ${addedMembershipsCount}개 추가됨.`);

        if (supabase) {
            if (newStudents.length > 0) {
                const mappedStudents = newStudents.map(s => ({
                    student_id: s.id,
                    name: s.name,
                    phone: String(s.phone).replace(/[^0-9]/g, '').padStart(11, '0'),
                    registration_date: s.registrationDate,
                    identification: s.id,
                    memo: s.notes || ''
                }));
                const { error } = await supabase.from('student').insert(mappedStudents);
                if (error) {
                    alert("학생 데이터 가져오기 중 오류가 발생했습니다: " + error.message);
                    console.error(error);
                }
            }
            if (newMemberships.length > 0) {
                const mappedMemberships = newMemberships.map(m => {
                    const student = newStudents.find(s => s.id === m.studentId) || students.find(s => s.id === m.studentId);
                    return {
                        id: m.id,
                        identification: student?.id || m.studentId,
                        student_id: m.studentId,
                        pass_type: m.passType,
                        start_date: m.startDate,
                        end_date: m.endDate,
                        name: student?.name || '',
                        phone: student ? String(student.phone).replace(/[^0-9]/g, '').padStart(11, '0') : '',
                        price: m.price,
                        payment_method: m.paymentMethod,
                        cash_receipt_issued: m.cashReceiptIssued,
                        payment_date: m.paymentDate,
                        hold_start_date: m.holdStartDate,
                        hold_end_date: m.holdEndDate,
                        refund_amount: m.refundAmount || null
                    };
                });
                const { error } = await supabase.from('membership').insert(mappedMemberships);
                if (error) {
                    alert("멤버십 데이터 가져오기 중 오류가 발생했습니다: " + error.message);
                    console.error(error);
                }
            }
        }
    }, [supabase]);

    const importAttendance = useCallback(async (data: any[]) => {
        const newRecordsToInsert: AttendanceRecord[] = [];
        setAttendance(prev => {
            const newRecords = [...prev];
            let count = 0;
            data.forEach(item => {
                const exists = newRecords.some(r => r.studentId === item.student_id && r.date === item.attendance_date && r.classTime === item.class_time);
                if (!exists) {
                    const newRecord = {
                        id: crypto.randomUUID(),
                        studentId: item.student_id,
                        date: item.attendance_date,
                        classTime: item.class_time
                    };
                    newRecords.push(newRecord);
                    newRecordsToInsert.push(newRecord);
                    count++;
                }
            });
            if(count > 0) alert(`${count}개의 출석 기록을 가져왔습니다.`);
            else alert('새로운 출석 기록이 없습니다.');
            return newRecords;
        });

        if (supabase && newRecordsToInsert.length > 0) {
            const mappedAttendance = newRecordsToInsert.map(r => {
                const student = students.find(s => s.id === r.studentId);
                return {
                    attendance_id: r.id,
                    student_id: r.studentId,
                    identification: r.studentId,
                    attendance_date: r.date,
                    class_info: r.classTime,
                    name: student?.name || '',
                    phone: student ? String(student.phone).replace(/[^0-9]/g, '').padStart(11, '0') : ''
                };
            });
            const { error } = await supabase.from('attendance').insert(mappedAttendance);
            if (error) {
                alert("출석 데이터 가져오기 중 오류가 발생했습니다: " + error.message);
                console.error(error);
            }
        }
   }, [supabase]);
   
   const importExpenses = useCallback(async (data: any[]) => {
        const newExpensesToInsert: Expense[] = [];
        let count = 0;
        setExpenses(prev => {
            const newExpenses = [...prev];
            data.forEach(item => {
                // Duplicate check based on exact match of fields since ID might be new
                const exists = newExpenses.some(e => 
                    e.date === item.date && 
                    e.category === item.category && 
                    e.description === item.description && 
                    e.amount === Number(item.amount)
                );
                
                if (!exists) {
                     const newExpense = {
                        id: crypto.randomUUID(),
                        date: item.date,
                        category: item.category,
                        description: item.description,
                        amount: Number(item.amount)
                    };
                    newExpenses.push(newExpense);
                    newExpensesToInsert.push(newExpense);
                    count++;
                }
            });
            if(count > 0) alert(`${count}개의 지출 내역을 가져왔습니다.`);
            else alert('새로운 지출 내역이 없습니다.');
            return newExpenses;
        });

        if (supabase && newExpensesToInsert.length > 0) {
            const mappedExpenses = newExpensesToInsert.map(e => ({
                날짜: e.date,
                분류: e.category,
                내용: e.description,
                금액: e.amount
            }));
            const { error } = await supabase.from('expense').insert(mappedExpenses);
            if (error) {
                alert("지출 데이터 가져오기 중 오류가 발생했습니다: " + error.message);
                console.error(error);
            }
        }
   }, [supabase]);

    const toggleAttendance = useCallback(async (studentId: string, date: string, classTime: string, classId?: string) => {
        const formattedDate = dayjs(date).tz('Asia/Seoul').format('YYYY-MM-DD');
        const targetClassId = classId || '';
        const opKey = `${studentId}_${formattedDate}_${targetClassId}`;

        // 1. 즉각적인 로컬 UI 상태 전환 (0ms 렉 제로)
        const student = students.find(s => s.id === studentId);
        
        const existingRecord = attendanceRef.current.find(a => {
            const aDate = dayjs(a.date).tz('Asia/Seoul').format('YYYY-MM-DD');
            return a.studentId === studentId && aDate === formattedDate && (a.classId || '') === targetClassId;
        });

        const willBeChecked = !existingRecord;

        setAttendance(prev => {
            if (!willBeChecked) {
                // 출석 취소 (삭제)
                return prev.filter(a => {
                    const aDate = dayjs(a.date).tz('Asia/Seoul').format('YYYY-MM-DD');
                    const match = a.studentId === studentId && aDate === formattedDate && (a.classId || '') === targetClassId;
                    return !match;
                });
            } else {
                // 출석 체크 (추가)
                // 중복 체크 방지
                const alreadyExists = prev.some(a => {
                    const aDate = dayjs(a.date).tz('Asia/Seoul').format('YYYY-MM-DD');
                    return a.studentId === studentId && aDate === formattedDate && (a.classId || '') === targetClassId;
                });
                if (alreadyExists) return prev;

                const tempRecord: AttendanceRecord = {
                    id: `temp-${crypto.randomUUID()}`,
                    studentId,
                    date: formattedDate,
                    classTime,
                    classId: targetClassId,
                    studentName: student?.name || '',
                    studentPhone: student?.phone || ''
                };
                return [...prev, tempRecord];
            }
        });

        // 2. 비동기 데이터베이스 작업을 순차적(FIFO Queue)으로 체이닝하여 연타 및 레이스 컨디션 해결
        setSubmittingKeys(prev => prev.includes(opKey) ? prev : [...prev, opKey]);

        const nextPromise = (pendingPromises.current[opKey] || Promise.resolve())
            .then(async () => {
                if (!supabase) return;

                // 데이터베이스 최신 상태 확인
                const { data: existing, error: checkError } = await supabase
                    .from('attendance')
                    .select('attendance_id')
                    .eq('student_id', studentId)
                    .eq('attendance_date', formattedDate)
                    .eq('class_id', targetClassId)
                    .maybeSingle();

                if (checkError) throw checkError;

                if (willBeChecked) {
                    // 출석하려는 상태인데 DB에 없는 경우에만 Upsert 실행
                    if (!existing) {
                        const { error: upsertError } = await supabase
                            .from('attendance')
                            .upsert([{
                                student_id: studentId,
                                attendance_date: formattedDate,
                                class_info: classTime,
                                class_id: targetClassId,
                                name: student?.name || '',
                                phone: student?.phone ? String(student?.phone).replace(/[^0-9]/g, '').padStart(11, '0') : ''
                            }], { 
                                onConflict: 'student_id,attendance_date,class_id' 
                            });

                        if (upsertError) throw upsertError;
                    }
                } else {
                    // 출석 취소하려는 상태인데 DB에 존재하는 경우에만 Delete 실행
                    if (existing) {
                        const { error: deleteError } = await supabase
                            .from('attendance')
                            .delete()
                            .eq('attendance_id', existing.attendance_id);
                        
                        if (deleteError) throw deleteError;
                    }
                }

                // 성공 시 백그라운드 데이터 동기화
                await fetchData();
            })
            .catch((error) => {
                console.error("출석 동기화 중 오류 발생:", error);
                // 에러 발생 시 최신 DB 상태로 전체 리프레시하여 자동 롤백/복구
                fetchData();
            })
            .finally(() => {
                // 특정 학생/수업에 대한 잠금 표시 해제
                setSubmittingKeys(prev => prev.filter(k => k !== opKey));
            });

        // 큐 갱신
        pendingPromises.current[opKey] = nextPromise;
    }, [supabase, students, fetchData]);

    const addOrUpdateSchedule = useCallback(async (classData: ClassSchedule) => {
        setSchedule(prev => {
            const exists = prev.some(c => c.id === classData.id);
            if (exists) {
                return prev.map(c => c.id === classData.id ? classData : c);
            }
            return [...prev, classData];
        });

        if (supabase) {
            const { error } = await supabase.from('classes').upsert({
                id: classData.id,
                day_of_week: classData.dayOfWeek,
                start_time: classData.startTime,
                end_time: classData.endTime,
                class_name: classData.className,
                color: classData.color
            });
            if (error) console.error('Error updating schedule:', error);
        }
    }, [supabase]);

    const deleteSchedule = useCallback(async (classId: string) => {
        setSchedule(prev => prev.filter(c => c.id !== classId));
        if (supabase) {
            const { error } = await supabase.from('classes').delete().eq('id', classId);
            if (error) {
                console.error('Error deleting schedule:', error);
                alert('수업 삭제 중 오류가 발생했습니다. (DB Error)');
            } else {
                console.log('Class deleted successfully from DB');
            }
        }
    }, [supabase]);

    const updateStudent = useCallback(async (studentId: string, updates: Partial<Student>) => {
        setStudents(prev => prev.map(s => s.id === studentId ? { ...s, ...updates } : s));
        if (supabase) {
            const mappedUpdates: any = { ...updates };
            if (updates.phone) {
                mappedUpdates.phone = String(updates.phone).replace(/[^0-9]/g, '').padStart(11, '0');
            }
            if (updates.notes) {
                mappedUpdates.memo = updates.notes;
                delete mappedUpdates.notes;
            }
            const { error } = await supabase.from('student').update(mappedUpdates).eq('student_id', studentId);
            if (error) {
                alert("학생 정보 수정 중 오류가 발생했습니다: " + error.message);
                console.error(error);
            }
        }
    }, [supabase]);

    const addExpense = useCallback(async (expense: Omit<Expense, 'id'>) => {
        const newExpenseId = crypto.randomUUID();
        const newTransactionId = crypto.randomUUID();
        const newExpense = { ...expense, id: newExpenseId, transactionId: newTransactionId };
        
        const newTransaction: Transaction = {
            id: newTransactionId,
            type: 'Expense',
            category: newExpense.category,
            amount: newExpense.amount,
            date: dayjs(newExpense.date).tz('Asia/Seoul').toISOString(),
            description: newExpense.description,
        };

        setExpenses(prev => [...prev, newExpense]);
        setTransactions(prev => [...prev, newTransaction]);

        if (supabase) {
            const { error } = await supabase.from('expense').insert([{
                id: newExpense.id,
                날짜: newExpense.date,
                분류: newExpense.category,
                내용: newExpense.description,
                금액: newExpense.amount,
                transaction_id: newExpense.transactionId
            }]);
            if (error) {
                alert("지출 저장 중 오류가 발생했습니다: " + error.message);
                console.error(error);
            }

            // Insert transaction
            await supabase.from('transaction_history').insert([{
                id: newTransaction.id,
                type: newTransaction.type,
                category: newTransaction.category,
                amount: newTransaction.amount,
                date: newTransaction.date,
                description: newTransaction.description
            }]);
        }
    }, [supabase]);

    const deleteExpense = useCallback(async (expenseId: string) => {
        const expenseToDelete = expenses.find(e => e.id === expenseId);
        setExpenses(prev => prev.filter(e => e.id !== expenseId));
        
        if (expenseToDelete) {
            // Remove transaction from local state
            setTransactions(prev => prev.filter(t => t.id !== expenseToDelete.transactionId));
        }

        if (supabase && expenseToDelete) {
            // Delete from expense table
            const { error: expenseError } = await supabase.from('expense').delete().eq('id', expenseId);
            if (expenseError) {
                // Fallback for older entries without ID
                await supabase.from('expense').delete()
                    .eq('날짜', expenseToDelete.date)
                    .eq('분류', expenseToDelete.category)
                    .eq('내용', expenseToDelete.description)
                    .eq('금액', expenseToDelete.amount);
            }

            // Delete from transaction_history
            if (expenseToDelete.transactionId) {
                await supabase.from('transaction_history').delete().eq('id', expenseToDelete.transactionId);
            } else {
                // Fallback for older entries without transactionId
                await supabase.from('transaction_history').delete()
                    .eq('type', 'Expense')
                    .eq('category', expenseToDelete.category)
                    .eq('amount', expenseToDelete.amount)
                    .eq('description', expenseToDelete.description);
            }
        }
    }, [expenses, supabase]);

    const refundMembership = useCallback(async (membershipId: string, refundAmount: number, refundReason: string) => {
        const amount = parseAmount(refundAmount);
        const today = dayjs().tz('Asia/Seoul').toISOString();
        
        setMemberships(prev => prev.map(m => m.id === membershipId ? { ...m, refundAmount: amount, refundReason } : m));
        
        const membership = memberships.find(m => m.id === membershipId);
        if (membership) {
            const newTransaction: Transaction = {
                id: crypto.randomUUID(),
                type: 'Expense',
                category: '환불',
                amount: amount,
                date: today,
                description: `환불: ${membership.passType} (${refundReason})`,
                studentId: membership.studentId,
                membershipId: membershipId
            };
            setTransactions(prev => [...prev, newTransaction]);

            if (supabase) {
                const { error } = await supabase.from('membership').update({ refund_amount: amount }).eq('id', membershipId);
                if (error) {
                    alert("환불 처리 중 오류가 발생했습니다: " + error.message);
                    console.error(error);
                    return;
                }
                
                // Insert transaction
                await supabase.from('transaction_history').insert([{
                    id: newTransaction.id,
                    type: newTransaction.type,
                    category: newTransaction.category,
                    amount: newTransaction.amount,
                    date: newTransaction.date,
                    description: newTransaction.description,
                    student_id: newTransaction.studentId,
                    membership_id: newTransaction.membershipId
                }]);

                const { error: refundError } = await supabase.from('refund_amount').insert([{
                    student_id: membership.studentId,
                    membership_id: membershipId,
                    refund_amount: amount,
                    refund_date: today,
                    refund_reason: refundReason
                }]);
                if (refundError) {
                    alert("환불 내역 저장 중 오류가 발생했습니다: " + refundError.message);
                    console.error(refundError);
                }
            }
        }
        alert("환불 처리가 완료되었습니다.");
    }, [supabase, memberships]);

    const renderContent = () => {
        switch (view) {
            case 'dashboard':
                return <Dashboard students={students} memberships={memberships} expenses={expenses} attendance={attendance} attendanceFormatted={attendanceFormatted} schedule={schedule} refreshData={fetchData} transactions={transactions} />;
            case 'active_members':
                return <ActiveMemberManager 
                    students={students} 
                    memberships={memberships} 
                    attendance={attendance} 
                    updateStudent={updateStudent}
                    updateStudentAndMembership={updateStudentAndMembership}
                    upgradeMembership={upgradeMembership}
                    deleteStudent={deleteStudent}
                />;
            case 'memberships':
                return <MembershipHistoryManager 
                    students={students} 
                    memberships={memberships} 
                    addStudent={addStudent}
                    addMembership={addMembership}
                    refundMembership={refundMembership}
                    deleteStudent={deleteStudent}
                />;
            case 'schedule':
                return <AttendanceManager 
                    students={students} 
                    memberships={memberships}
                    attendance={attendance} 
                    schedule={schedule}
                    toggleAttendance={toggleAttendance}
                    submittingKeys={submittingKeys}
                    addOrUpdateSchedule={addOrUpdateSchedule}
                    deleteSchedule={deleteSchedule}
                    updateStudent={updateStudent}
                />;
            case 'expenses':
                return <ExpenseManager expenses={expenses} addExpense={addExpense} deleteExpense={deleteExpense} importExpenses={importExpenses} />;
            case 'financial_report':
                return <FinancialReport transactions={transactions} students={students} memberships={memberships} expenses={expenses} />;
            default:
                return <div>Unknown View</div>;
        }
    };

    return (
        <div className="flex h-screen bg-gray-50 font-sans">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col">
                <div className="p-6 border-b border-gray-100">
                    <h1 className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
                        <span>🧘‍♀️</span> Yogao
                    </h1>
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 mt-1 font-semibold">Business Manager</p>
                </div>
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    <button
                        onClick={() => setView('dashboard')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
                    >
                        <DashboardIcon className="w-5 h-5" />
                        <span className="font-medium">대시보드</span>
                    </button>
                    <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">회원 및 이용권</div>
                    <button
                        onClick={() => setView('active_members')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${view === 'active_members' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
                    >
                        <StudentsIcon className="w-5 h-5" />
                        <span className="font-medium">유효 회원 관리</span>
                    </button>
                    <button
                        onClick={() => setView('memberships')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${view === 'memberships' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
                    >
                        <FinancialsIcon className="w-5 h-5" />
                        <span className="font-medium">멤버십(결제) 관리</span>
                    </button>
                    <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">운영 도구</div>
                    <button
                        onClick={() => setView('schedule')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${view === 'schedule' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
                    >
                        <AttendanceIcon className="w-5 h-5" />
                        <span className="font-medium">시간표 & 출결</span>
                    </button>
                    <button
                        onClick={() => setView('expenses')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${view === 'expenses' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
                    >
                        <ExpenseIcon className="w-5 h-5" />
                        <span className="font-medium">지출 관리</span>
                    </button>
                    <button
                        onClick={() => setView('financial_report')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${view === 'financial_report' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
                    >
                        <DashboardIcon className="w-5 h-5" />
                        <span className="font-medium">재무 리포트</span>
                    </button>
                </nav>
                <div className="p-6 border-t border-gray-100 text-[10px] text-center text-gray-400 font-medium">
                    &copy; 2024 Yogao Studio
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto bg-gray-50">
                <div className="p-8 max-w-7xl mx-auto">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default App;
