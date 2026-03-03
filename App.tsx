
import React, { useState, useCallback } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Student, Membership, AttendanceRecord, ViewType, PassType, Expense, ClassSchedule } from './types';
import { PASS_PRICES, PASS_DURATIONS, DEFAULT_SCHEDULE } from './constants';
import { Dashboard } from './components/Dashboard';
import { AttendanceManager } from './components/AttendanceManager';
import { ExpenseManager } from './components/ExpenseManager';
import { ActiveMemberManager } from './components/ActiveMemberManager';
import { MembershipHistoryManager } from './components/MembershipHistoryManager';
import { DashboardIcon, StudentsIcon, AttendanceIcon, ExpenseIcon, FinancialsIcon } from './components/icons';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

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

const calculateEndDate = (startDate: Date | string, passType: PassType): Date => {
    const duration = PASS_DURATIONS[passType];
    let end = dayjs(startDate);

    if (duration.unit === 'month') {
        const monthsToAdd = duration.value;
        const originalDay = end.date();
        
        // Add months
        end = end.add(monthsToAdd, 'month');
        
        // Handle month overflow (dayjs handles this by default, but let's be explicit if needed)
        // Actually dayjs.add(1, 'month') on Jan 31 results in Feb 28/29.
        
        // Calculate days to subtract based on rule:
        // 1~3 months -> -1 day
        // 6 months -> -2 days
        const daysToSubtract = Math.max(1, Math.floor(monthsToAdd / 3));
        end = end.subtract(daysToSubtract, 'day');
    } else {
        // Day based
        end = end.add(duration.value - 1, 'day');
    }
    return end.toDate();
};

const App: React.FC = () => {
    const [view, setView] = useState<ViewType>('dashboard');
    
    const [students, setStudents] = useState<Student[]>([]);
    const [memberships, setMemberships] = useState<Membership[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [schedule, setSchedule] = useState<ClassSchedule[]>(DEFAULT_SCHEDULE);

    const supabase = (window as any)._supabase;

    React.useEffect(() => {
        const fetchData = async () => {
            if (!supabase) return;
            const [
                { data: studentsData, error: studentError },
                { data: membershipsData, error: membershipError },
                { data: attendanceData, error: attendanceError },
                { data: expensesData, error: expenseError },
                { data: classesData, error: classError }
            ] = await Promise.all([
                supabase.from('student').select('*'),
                supabase.from('membership').select('*'),
                supabase.from('attendance').select('*'),
                supabase.from('expense').select('*'),
                supabase.from('classes').select('*')
            ]);
            
            console.log('--- Supabase Raw Data ---');
            console.log('students:', studentsData, studentError);
            console.log('membership:', membershipsData, membershipError);
            console.log('attendance:', attendanceData, attendanceError);
            console.log('expense:', expensesData, expenseError);
            console.log('classes:', classesData, classError);
            console.log('-------------------------');
            
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
                    paymentMethod: m.payment_method || m.paymentMethod,
                    cashReceiptIssued: m.cash_receipt_issued || m.cashReceiptIssued,
                }));
                setMemberships(mapped);
            }
            if (attendanceData) {
                const mapped = attendanceData.map((a: any) => ({
                    id: a.id,
                    studentId: a.student_id || a.studentId,
                    studentName: a.name || a['이름'] || a.studentName,
                    studentPhone: a.phone || a['연락처'] || a.studentPhone,
                    classId: a.class_id || a.classId,
                    date: a.attendance_date || a['출석 날짜'] || a.date,
                    classTime: a.class_info || a['수업 시간 정보'] || a.classTime,
                }));
                setAttendance(mapped);
            }
            if (expensesData) {
                const mappedExpenses = expensesData.map((e: any) => ({
                    id: e.id,
                    date: e.날짜 || e.date,
                    category: e.분류 || e.category,
                    description: e.내용 || e.description,
                    amount: typeof (e.금액 || e.amount) === 'string' 
                        ? Number((e.금액 || e.amount).replace(/[^0-9.-]+/g,"")) 
                        : Number(e.금액 || e.amount)
                }));
                setExpenses(mappedExpenses);
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
        };
        fetchData();
    }, [supabase]);

    const addStudent = useCallback(async (
        studentData: Omit<Student, 'id' | 'registrationDate'>, 
        passType: PassType, 
        startDateStr: string, 
        paymentDateStr: string, 
        paymentMethod: '카드' | '현금', 
        cashReceiptIssued: boolean,
        discountAmount: number = 0
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
        const endDate = dayjs(calculateEndDate(startDate.toDate(), passType));

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

        setStudents(prev => [...prev, newStudent]);
        setMemberships(prev => [...prev, newMembership]);

        if (supabase) {
            await supabase.from('student').insert([{
                id: newStudent.id,
                name: newStudent.name,
                phone: newStudent.phone,
                registration_date: newStudent.registrationDate,
                remarks: newStudent.remarks,
                memo: newStudent.memo
            }]);
            await supabase.from('membership').insert([{
                id: newMembership.id,
                student_id: newMembership.studentId,
                pass_type: newMembership.passType,
                start_date: newMembership.startDate,
                end_date: newMembership.endDate,
                price: newMembership.price,
                discount_amount: newMembership.discountAmount,
                payment_date: newMembership.paymentDate,
                payment_method: newMembership.paymentMethod,
                cash_receipt_issued: newMembership.cashReceiptIssued
            }]);
        }
    }, [supabase]);

    const addMembership = useCallback(async (
        studentId: string, 
        passType: PassType, 
        startDateStr: string, 
        paymentDateStr: string, 
        paymentMethod: '카드' | '현금', 
        cashReceiptIssued: boolean,
        customPrice?: number,
        discountAmount: number = 0
    ) => {
        const startDate = dayjs(parseDate(startDateStr));
        const endDate = dayjs(calculateEndDate(startDate.toDate(), passType));

        let price = customPrice !== undefined ? parseAmount(customPrice) : PASS_PRICES[passType];
        
        const studentMemberships = memberships.filter(m => m.studentId === studentId);
        const lastMembership = studentMemberships.sort((a, b) => dayjs(b.endDate).valueOf() - dayjs(a.endDate).valueOf())[0];

        if (customPrice === undefined) {
            const isNewPassShortTerm = passType === PassType.ONE_DAY || passType === PassType.ONE_WEEK;
            const isPrevPassShortTerm = lastMembership && (lastMembership.passType === PassType.ONE_DAY || lastMembership.passType === PassType.ONE_WEEK);

            if (!isNewPassShortTerm && !isPrevPassShortTerm) {
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

        setMemberships(prev => [...prev, newMembership]);

        if (supabase) {
            await supabase.from('membership').insert([{
                id: newMembership.id,
                student_id: newMembership.studentId,
                pass_type: newMembership.passType,
                start_date: newMembership.startDate,
                end_date: newMembership.endDate,
                price: newMembership.price,
                discount_amount: newMembership.discountAmount,
                payment_date: newMembership.paymentDate,
                payment_method: newMembership.paymentMethod,
                cash_receipt_issued: newMembership.cashReceiptIssued
            }]);
        }
    }, [memberships, supabase]);

    const upgradeMembership = useCallback(async (originalMembershipId: string, newPassType: PassType, paymentMethod: '카드' | '현금', cashReceiptIssued: boolean) => {
        const original = memberships.find(m => m.id === originalMembershipId);
        if (!original) return;

        const newFullPrice = PASS_PRICES[newPassType];
        const upgradeCost = newFullPrice - original.price;

        if (upgradeCost < 0) {
            alert("변경하려는 이용권의 가격이 현재 이용권보다 저렴합니다. 업그레이드는 더 높은 가격의 이용권으로만 가능합니다.");
            return;
        }

        const today = new Date();
        const paymentDateStr = today.toISOString();

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const updatedOriginal = {
            ...original,
            endDate: yesterday.toISOString(),
        };

        const originalStartDate = new Date(original.startDate);
        const newEndDate = calculateEndDate(originalStartDate, newPassType);

        const newMembership: Membership = {
            id: crypto.randomUUID(),
            studentId: original.studentId,
            passType: newPassType,
            startDate: original.startDate,
            endDate: newEndDate.toISOString(),
            price: upgradeCost,
            paymentDate: paymentDateStr,
            paymentMethod,
            cashReceiptIssued: paymentMethod === '현금' ? cashReceiptIssued : false,
        };

        setMemberships(prev => prev.map(m => m.id === originalMembershipId ? updatedOriginal : m).concat(newMembership));
        alert("이용권이 성공적으로 업그레이드 되었습니다.");

        if (supabase) {
            await supabase.from('membership').update({ endDate: updatedOriginal.endDate }).eq('id', originalMembershipId);
            await supabase.from('membership').insert([newMembership]);
        }
    }, [memberships, supabase]);

    const deleteStudent = useCallback(async (studentIdToDelete: string) => {
        setStudents(prevStudents => prevStudents.filter(student => student.id !== studentIdToDelete));
        setMemberships(prevMemberships => prevMemberships.filter(membership => membership.studentId !== studentIdToDelete));
        setAttendance(prevAttendance => prevAttendance.filter(record => record.studentId !== studentIdToDelete));

        if (supabase) {
            await supabase.from('student').delete().eq('id', studentIdToDelete);
            await supabase.from('membership').delete().eq('student_id', studentIdToDelete);
            await supabase.from('attendance').delete().eq('student_id', studentIdToDelete);
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
                await supabase.from('student').update(updatedStudentData).eq('id', studentId);
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
                    cash_receipt_issued: newFullMembershipData.cashReceiptIssued
                };
                await supabase.from('membership').update(mappedMembershipData).eq('id', membershipId);
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
                    const newRemarks = s.remarks ? `${s.remarks}\n${extensionRemark}` : extensionRemark;
                    const updatedStudent = { ...s, remarks: newRemarks };
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
                await supabase.from('student').update({ remarks: s.remarks }).eq('id', s.id);
            }
            for (const m of updatedMemberships) {
                await supabase.from('membership').update({ endDate: m.endDate }).eq('id', m.id);
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
                        remarks: item.student_remarks
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
                    id: s.id,
                    name: s.name,
                    phone: s.phone,
                    registration_date: s.registrationDate,
                    remarks: s.remarks,
                    memo: s.memo
                }));
                await supabase.from('student').insert(mappedStudents);
            }
            if (newMemberships.length > 0) {
                const mappedMemberships = newMemberships.map(m => ({
                    id: m.id,
                    student_id: m.studentId,
                    pass_type: m.passType,
                    start_date: m.startDate,
                    end_date: m.endDate,
                    price: m.price,
                    discount_amount: m.discountAmount,
                    refund_amount: m.refundAmount,
                    payment_date: m.paymentDate,
                    hold_start_date: m.holdStartDate,
                    hold_end_date: m.holdEndDate,
                    payment_method: m.paymentMethod,
                    cash_receipt_issued: m.cashReceiptIssued
                }));
                await supabase.from('membership').insert(mappedMemberships);
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
            await supabase.from('attendance').insert(newRecordsToInsert);
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
            await supabase.from('expense').insert(newExpensesToInsert);
        }
   }, [supabase]);

    const toggleAttendance = useCallback(async (studentId: string, date: string, classTime: string, classId?: string, existingRecordId?: string) => {
        const exists = existingRecordId ? attendance.find(a => a.id === existingRecordId) : attendance.find(a => {
            if (classId && a.classId) {
                return a.studentId === studentId && a.date === date && a.classId === classId;
            }
            return a.studentId === studentId && a.date === date && a.classTime === classTime;
        });

        if (exists) {
            setAttendance(prev => prev.filter(a => a.id !== exists.id));
            if (supabase) {
                await supabase.from('attendance').delete().eq('id', exists.id);
            }
        } else {
            const student = students.find(s => s.id === studentId);
            const newRecord = { 
                id: crypto.randomUUID(), 
                studentId, 
                date, 
                classTime, 
                classId,
                studentName: student?.name,
                studentPhone: student?.phone
            };
            setAttendance(prev => [...prev, newRecord]);
            if (supabase) {
                await supabase.from('attendance').insert([{
                    id: newRecord.id,
                    student_id: newRecord.studentId,
                    attendance_date: newRecord.date,
                    class_info: newRecord.classTime,
                    class_id: newRecord.classId,
                    name: newRecord.studentName,
                    phone: newRecord.studentPhone
                }]);
            }
        }
    }, [attendance, supabase, students]);

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
            await supabase.from('student').update(updates).eq('id', studentId);
        }
    }, [supabase]);

    const addExpense = useCallback(async (expense: Omit<Expense, 'id'>) => {
        const newExpense = { ...expense, id: crypto.randomUUID() };
        setExpenses(prev => [...prev, newExpense]);
        if (supabase) {
            await supabase.from('expense').insert([{
                id: newExpense.id,
                날짜: newExpense.date,
                분류: newExpense.category,
                내용: newExpense.description,
                금액: newExpense.amount
            }]);
        }
    }, [supabase]);

    const deleteExpense = useCallback(async (expenseId: string) => {
        setExpenses(prev => prev.filter(e => e.id !== expenseId));
        if (supabase) {
            await supabase.from('expense').delete().eq('id', expenseId);
        }
    }, [supabase]);

    const refundMembership = useCallback(async (membershipId: string, refundAmount: number) => {
        const amount = parseAmount(refundAmount);
        setMemberships(prev => prev.map(m => m.id === membershipId ? { ...m, refundAmount: amount } : m));
        if (supabase) {
            await supabase.from('membership').update({ refund_amount: amount }).eq('id', membershipId);
        }
        alert("환불 처리가 완료되었습니다.");
    }, [supabase]);

    const renderContent = () => {
        switch (view) {
            case 'dashboard':
                return <Dashboard students={students} memberships={memberships} expenses={expenses} attendance={attendance} schedule={schedule} />;
            case 'active_members':
                return <ActiveMemberManager 
                    students={students} 
                    memberships={memberships} 
                    attendance={attendance} 
                    updateStudent={updateStudent}
                    updateStudentAndMembership={updateStudentAndMembership}
                />;
            case 'memberships':
                return <MembershipHistoryManager 
                    students={students} 
                    memberships={memberships} 
                    addStudent={addStudent}
                    addMembership={addMembership}
                    refundMembership={refundMembership}
                />;
            case 'schedule':
                return <AttendanceManager 
                    students={students} 
                    memberships={memberships}
                    attendance={attendance} 
                    schedule={schedule}
                    toggleAttendance={toggleAttendance}
                    addOrUpdateSchedule={addOrUpdateSchedule}
                    deleteSchedule={deleteSchedule}
                />;
            case 'expenses':
                return <ExpenseManager expenses={expenses} addExpense={addExpense} deleteExpense={deleteExpense} importExpenses={importExpenses} />;
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
