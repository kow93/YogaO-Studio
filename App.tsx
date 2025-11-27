
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
    
    const [students, setStudents] = useLocalStorage<Student[]>('students', []);
    const [memberships, setMemberships] = useLocalStorage<Membership[]>('memberships', []);
    const [attendance, setAttendance] = useLocalStorage<AttendanceRecord[]>('attendance', []);
    
    const [expenses, setExpenses] = useLocalStorage<Expense[]>('expenses', []);
    const [schedule, setSchedule] = useLocalStorage<ClassSchedule[]>('schedule', DEFAULT_SCHEDULE);

    const addStudent = useCallback((studentData: Omit<Student, 'id' | 'registrationDate'>, passType: PassType, startDateStr: string, paymentDateStr: string, paymentMethod: '카드' | '현금', cashReceiptIssued: boolean) => {
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
    }, [setStudents, setMemberships]);

    const addMembership = useCallback((
        studentId: string, 
        passType: PassType, 
        startDateStr: string, 
        paymentDateStr: string, 
        paymentMethod: '카드' | '현금', 
        cashReceiptIssued: boolean,
        customPrice?: number
    ) => {
        setMemberships(prev => {
            const startDate = new Date(startDateStr);
            const endDate = calculateEndDate(startDate, passType);

            const studentMemberships = prev.filter(m => m.studentId === studentId);
            const lastMembership = studentMemberships.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0];

            let price = customPrice !== undefined ? customPrice : PASS_PRICES[passType];

            // Apply discount logic ONLY if customPrice is NOT provided
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

            return [...prev, newMembership];
        });
    }, [setMemberships]);

    const upgradeMembership = useCallback((originalMembershipId: string, newPassType: PassType, paymentMethod: '카드' | '현금', cashReceiptIssued: boolean) => {
        setMemberships(prev => {
            const original = prev.find(m => m.id === originalMembershipId);
            if (!original) return prev;

            const newFullPrice = PASS_PRICES[newPassType];
            const upgradeCost = newFullPrice - original.price;

            if (upgradeCost < 0) {
                alert("변경하려는 이용권의 가격이 현재 이용권보다 저렴합니다. 업그레이드는 더 높은 가격의 이용권으로만 가능합니다.");
                return prev;
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

            alert("이용권이 성공적으로 업그레이드 되었습니다.");
            return prev.map(m => m.id === originalMembershipId ? updatedOriginal : m).concat(newMembership);
        });
    }, [setMemberships]);

    const deleteStudent = useCallback((studentIdToDelete: string) => {
        setStudents(prevStudents => prevStudents.filter(student => student.id !== studentIdToDelete));
        setMemberships(prevMemberships => prevMemberships.filter(membership => membership.studentId !== studentIdToDelete));
        setAttendance(prevAttendance => prevAttendance.filter(record => record.studentId !== studentIdToDelete));
    }, [setStudents, setMemberships, setAttendance]);
    
    const updateStudentAndMembership = useCallback((
        studentId: string,
        membershipId: string,
        updatedStudentData: Partial<Omit<Student, 'id'>>,
        updatedMembershipData: Partial<Omit<Membership, 'id' | 'studentId'>>
    ) => {
        setStudents(prev => prev.map(s => s.id === studentId ? { ...s, ...updatedStudentData } : s));
        
        setMemberships(prev => prev.map(m => {
            if (m.id !== membershipId) return m;

            const newFullMembershipData = { ...m, ...updatedMembershipData };

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

            return newFullMembershipData;
        }));
    }, [setStudents, setMemberships]);

    const bulkExtendMemberships = useCallback((days: number, reason: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
    
        // Calculate which students to update (need to access current state inside callback)
        // Using functional update to ensure we have latest data
        setMemberships(prevMemberships => {
             const studentIdsToUpdate = new Set(
                prevMemberships
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
                return prevMemberships;
            }
            
            alert(`${studentIdsToUpdate.size}명의 활성 회원 이용권이 ${days}일 연장되었습니다.`);

            // Update students remarks
            setStudents(prevStudents =>
                prevStudents.map(s => {
                    if (studentIdsToUpdate.has(s.id)) {
                        const extensionRemark = `[${new Date().toLocaleDateString('ko-KR')}] "${reason}" 사유로 ${days}일 연장.`;
                        const newRemarks = s.remarks ? `${s.remarks}\n${extensionRemark}` : extensionRemark;
                        return { ...s, remarks: newRemarks };
                    }
                    return s;
                })
            );

            return prevMemberships.map(m => {
                if (studentIdsToUpdate.has(m.studentId)) {
                    const newEndDate = new Date(m.endDate);
                    newEndDate.setDate(newEndDate.getDate() + days);
                    return { ...m, endDate: newEndDate.toISOString() };
                }
                return m;
            });
        });
    }, [setMemberships, setStudents]);

    const importStudentsAndMemberships = useCallback((data: any[]) => {
        let addedStudentsCount = 0;
        let addedMembershipsCount = 0;

        setStudents(prevStudents => {
            const updatedStudents = [...prevStudents];
            data.forEach(item => {
                if (!item.student_id || !item.student_name) return;
                const exists = updatedStudents.some(s => s.id === item.student_id);
                if (!exists) {
                    updatedStudents.push({
                        id: item.student_id,
                        name: item.student_name,
                        phone: item.student_phone,
                        registrationDate: item.student_registrationDate || new Date().toISOString(),
                        remarks: item.student_remarks
                    });
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
                     updatedMemberships.push({
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
                     });
                     addedMembershipsCount++;
                 }
            });
            return updatedMemberships;
        });
        alert(`데이터 가져오기 완료: 학생 ${addedStudentsCount}명, 이용권 ${addedMembershipsCount}개 추가됨.`);
    }, [setStudents, setMemberships]);

    const importAttendance = useCallback((data: any[]) => {
        setAttendance(prev => {
            const newRecords = [...prev];
            let count = 0;
            data.forEach(item => {
                const exists = newRecords.some(r => r.studentId === item.student_id && r.date === item.attendance_date && r.classTime === item.class_time);
                if (!exists) {
                    newRecords.push({
                        id: crypto.randomUUID(),
                        studentId: item.student_id,
                        date: item.attendance_date,
                        classTime: item.class_time
                    });
                    count++;
                }
            });
            if(count > 0) alert(`${count}개의 출석 기록을 가져왔습니다.`);
            else alert('새로운 출석 기록이 없습니다.');
            return newRecords;
        });
   }, [setAttendance]);

    const toggleAttendance = useCallback((studentId: string, date: string, classTime: string) => {
        setAttendance(prev => {
            const exists = prev.find(a => a.studentId === studentId && a.date === date && a.classTime === classTime);
            if (exists) {
                return prev.filter(a => a.id !== exists.id);
            } else {
                return [...prev, { id: crypto.randomUUID(), studentId, date, classTime }];
            }
        });
    }, [setAttendance]);

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

    const addExpense = useCallback((expense: Omit<Expense, 'id'>) => {
        setExpenses(prev => [...prev, { ...expense, id: crypto.randomUUID() }]);
    }, [setExpenses]);

    const deleteExpense = useCallback((expenseId: string) => {
        setExpenses(prev => prev.filter(e => e.id !== expenseId));
    }, [setExpenses]);

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
                return <ExpenseManager expenses={expenses} addExpense={addExpense} deleteExpense={deleteExpense} />;
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
