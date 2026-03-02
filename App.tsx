
import React, { useState, useCallback } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Student, Membership, AttendanceRecord, ViewType, PassType, Expense, ClassSchedule } from './types';
import { PASS_PRICES, PASS_DURATIONS, DEFAULT_SCHEDULE } from './constants';
import { Dashboard } from './components/Dashboard';
import { StudentManager } from './components/StudentManager';
import { ScheduleManager } from './components/ScheduleManager';
import { ExpenseManager } from './components/ExpenseManager';
import { FinancialReport } from './components/FinancialReport';
import { DashboardIcon, StudentsIcon, AttendanceIcon, ExpenseIcon, FinancialsIcon } from './components/icons';

const calculateEndDate = (startDate: Date, passType: PassType): Date => {
    const duration = PASS_DURATIONS[passType];
    const end = new Date(startDate);

    if (duration.unit === 'month') {
        const monthsToAdd = duration.value;
        const originalDay = end.getDate();
        
        // Add months
        end.setMonth(end.getMonth() + monthsToAdd);
        
        // Handle month overflow (e.g. Jan 31 -> Feb 28)
        if (end.getDate() !== originalDay) {
            end.setDate(0);
        }

        // Calculate days to subtract based on rule:
        // 1~3 months (floor(m/3)=0 or 1) -> -1 day (max(1, 0~1) = 1)
        // 6 months (floor(6/3)=2) -> -2 days (max(1, 2) = 2)
        const daysToSubtract = Math.max(1, Math.floor(monthsToAdd / 3));
        end.setDate(end.getDate() - daysToSubtract);
    } else {
        // Day based
        end.setDate(end.getDate() + duration.value - 1);
    }
    return end;
};

const App: React.FC = () => {
    const [view, setView] = useState<ViewType>('dashboard');
    
    const [students, setStudents] = useState<Student[]>([]);
    const [memberships, setMemberships] = useState<Membership[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [schedule, setSchedule] = useLocalStorage<ClassSchedule[]>('schedule', DEFAULT_SCHEDULE);

    const supabase = (window as any)._supabase;

    React.useEffect(() => {
        const fetchData = async () => {
            if (!supabase) return;
            const [
                { data: studentsData },
                { data: membershipsData },
                { data: attendanceData },
                { data: expensesData }
            ] = await Promise.all([
                supabase.from('students').select('*'),
                supabase.from('memberships').select('*'),
                supabase.from('attendance').select('*'),
                supabase.from('expenses').select('*')
            ]);
            
            if (studentsData) setStudents(studentsData);
            if (membershipsData) setMemberships(membershipsData);
            if (attendanceData) setAttendance(attendanceData);
            if (expensesData) setExpenses(expensesData);
        };
        fetchData();
    }, [supabase]);

    const addStudent = useCallback(async (studentData: Omit<Student, 'id' | 'registrationDate'>, passType: PassType, startDateStr: string, paymentDateStr: string, paymentMethod: '카드' | '현금', cashReceiptIssued: boolean) => {
        const studentId = crypto.randomUUID();
        const registrationDate = new Date().toISOString();
        const newStudent: Student = { ...studentData, id: studentId, registrationDate };
        
        const startDate = new Date(startDateStr);
        const endDate = calculateEndDate(startDate, passType);

        const newMembership: Membership = {
            id: crypto.randomUUID(),
            studentId,
            passType,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            price: PASS_PRICES[passType],
            paymentDate: new Date(paymentDateStr).toISOString(),
            paymentMethod,
            cashReceiptIssued: paymentMethod === '현금' ? cashReceiptIssued : false,
        };

        setStudents(prev => [...prev, newStudent]);
        setMemberships(prev => [...prev, newMembership]);

        if (supabase) {
            await supabase.from('students').insert([newStudent]);
            await supabase.from('memberships').insert([newMembership]);
        }
    }, [supabase]);

    const addMembership = useCallback(async (
        studentId: string, 
        passType: PassType, 
        startDateStr: string, 
        paymentDateStr: string, 
        paymentMethod: '카드' | '현금', 
        cashReceiptIssued: boolean,
        customPrice?: number
    ) => {
        const startDate = new Date(startDateStr);
        const endDate = calculateEndDate(startDate, passType);

        let price = customPrice !== undefined ? customPrice : PASS_PRICES[passType];
        
        const studentMemberships = memberships.filter(m => m.studentId === studentId);
        const lastMembership = studentMemberships.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0];

        if (customPrice === undefined) {
            const isNewPassShortTerm = passType === PassType.ONE_DAY || passType === PassType.ONE_WEEK;
            const isPrevPassShortTerm = lastMembership && (lastMembership.passType === PassType.ONE_DAY || lastMembership.passType === PassType.ONE_WEEK);

            if (!isNewPassShortTerm && !isPrevPassShortTerm) {
                price -= 10000;
            }
        }

        const newMembership: Membership = {
            id: crypto.randomUUID(),
            studentId,
            passType,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            price: price,
            paymentDate: new Date(paymentDateStr).toISOString(),
            paymentMethod,
            cashReceiptIssued: paymentMethod === '현금' ? cashReceiptIssued : false,
        };

        setMemberships(prev => [...prev, newMembership]);

        if (supabase) {
            await supabase.from('memberships').insert([newMembership]);
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
            await supabase.from('memberships').update({ endDate: updatedOriginal.endDate }).eq('id', originalMembershipId);
            await supabase.from('memberships').insert([newMembership]);
        }
    }, [memberships, supabase]);

    const deleteStudent = useCallback(async (studentIdToDelete: string) => {
        setStudents(prevStudents => prevStudents.filter(student => student.id !== studentIdToDelete));
        setMemberships(prevMemberships => prevMemberships.filter(membership => membership.studentId !== studentIdToDelete));
        setAttendance(prevAttendance => prevAttendance.filter(record => record.studentId !== studentIdToDelete));

        if (supabase) {
            await supabase.from('students').delete().eq('id', studentIdToDelete);
            await supabase.from('memberships').delete().eq('studentId', studentIdToDelete);
            await supabase.from('attendance').delete().eq('studentId', studentIdToDelete);
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
                await supabase.from('students').update(updatedStudentData).eq('id', studentId);
            }
            if (newFullMembershipData) {
                await supabase.from('memberships').update(newFullMembershipData).eq('id', membershipId);
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
                await supabase.from('students').update({ remarks: s.remarks }).eq('id', s.id);
            }
            for (const m of updatedMemberships) {
                await supabase.from('memberships').update({ endDate: m.endDate }).eq('id', m.id);
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
            if (newStudents.length > 0) await supabase.from('students').insert(newStudents);
            if (newMemberships.length > 0) await supabase.from('memberships').insert(newMemberships);
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
            await supabase.from('expenses').insert(newExpensesToInsert);
        }
   }, [supabase]);

    const toggleAttendance = useCallback(async (studentId: string, date: string, classTime: string) => {
        const exists = attendance.find(a => a.studentId === studentId && a.date === date && a.classTime === classTime);
        if (exists) {
            setAttendance(prev => prev.filter(a => a.id !== exists.id));
            if (supabase) {
                await supabase.from('attendance').delete().eq('id', exists.id);
            }
        } else {
            const newRecord = { id: crypto.randomUUID(), studentId, date, classTime };
            setAttendance(prev => [...prev, newRecord]);
            if (supabase) {
                await supabase.from('attendance').insert([newRecord]);
            }
        }
    }, [attendance, supabase]);

    const addOrUpdateSchedule = useCallback((classData: ClassSchedule) => {
        setSchedule(prev => {
            const exists = prev.some(c => c.id === classData.id);
            if (exists) {
                return prev.map(c => c.id === classData.id ? classData : c);
            }
            return [...prev, classData];
        });
    }, [setSchedule]);

    const deleteSchedule = useCallback((classId: string) => {
        setSchedule(prev => prev.filter(c => c.id !== classId));
    }, [setSchedule]);

    const addExpense = useCallback(async (expense: Omit<Expense, 'id'>) => {
        const newExpense = { ...expense, id: crypto.randomUUID() };
        setExpenses(prev => [...prev, newExpense]);
        if (supabase) {
            await supabase.from('expenses').insert([newExpense]);
        }
    }, [supabase]);

    const deleteExpense = useCallback(async (expenseId: string) => {
        setExpenses(prev => prev.filter(e => e.id !== expenseId));
        if (supabase) {
            await supabase.from('expenses').delete().eq('id', expenseId);
        }
    }, [supabase]);

    const renderContent = () => {
        switch (view) {
            case 'dashboard':
                return <Dashboard students={students} memberships={memberships} expenses={expenses} attendance={attendance} schedule={schedule} />;
            case 'students':
                return <StudentManager 
                    students={students} 
                    memberships={memberships} 
                    addStudent={addStudent} 
                    addMembership={addMembership} 
                    deleteStudent={deleteStudent}
                    updateStudentAndMembership={updateStudentAndMembership}
                    bulkExtendMemberships={bulkExtendMemberships}
                    importStudentsAndMemberships={importStudentsAndMemberships}
                    upgradeMembership={upgradeMembership}
                />;
            case 'schedule':
                return <ScheduleManager 
                    students={students} 
                    memberships={memberships} 
                    attendance={attendance} 
                    toggleAttendance={toggleAttendance}
                    schedule={schedule}
                    addOrUpdateSchedule={addOrUpdateSchedule}
                    deleteSchedule={deleteSchedule}
                    importAttendance={importAttendance}
                />;
            case 'expenses':
                return <ExpenseManager expenses={expenses} addExpense={addExpense} deleteExpense={deleteExpense} importExpenses={importExpenses} />;
            case 'financials':
                return <FinancialReport memberships={memberships} expenses={expenses} students={students} />;
            default:
                return <div>Unknown View</div>;
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            {/* Sidebar */}
            <div className="w-64 bg-white shadow-lg flex-shrink-0 flex flex-col">
                <div className="p-6 border-b">
                    <h1 className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
                        <span>🧘‍♀️</span> Yogao
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">Studio Manager</p>
                </div>
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <button
                        onClick={() => setView('dashboard')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${view === 'dashboard' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <DashboardIcon className="w-5 h-5" />
                        <span>대시보드</span>
                    </button>
                    <button
                        onClick={() => setView('students')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${view === 'students' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <StudentsIcon className="w-5 h-5" />
                        <span>회원 관리</span>
                    </button>
                    <button
                        onClick={() => setView('schedule')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${view === 'schedule' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <AttendanceIcon className="w-5 h-5" />
                        <span>시간표 & 출결</span>
                    </button>
                    <button
                        onClick={() => setView('expenses')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${view === 'expenses' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <ExpenseIcon className="w-5 h-5" />
                        <span>가계부 (지출)</span>
                    </button>
                    <button
                        onClick={() => setView('financials')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${view === 'financials' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <FinancialsIcon className="w-5 h-5" />
                        <span>재무 리포트</span>
                    </button>
                </nav>
                <div className="p-4 border-t text-xs text-center text-gray-400">
                    &copy; 2024 Yogao Studio
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                <div className="p-8 max-w-7xl mx-auto">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default App;
