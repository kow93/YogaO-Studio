
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
        // If the day changed, it means the target month has fewer days.
        // We should set it to the last day of the previous month (which is the intended month).
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
    // 회원 관련 데이터는 테스트를 위해 앱 재시작 시 초기화되도록 useState를 사용합니다.
    const [students, setStudents] = useState<Student[]>([]);
    const [memberships, setMemberships] = useState<Membership[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    
    // 스튜디오 운영 데이터는 유지되도록 useLocalStorage를 사용합니다.
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
    }, []);

    const addMembership = useCallback((studentId: string, passType: PassType, startDateStr: string, paymentDateStr: string, paymentMethod: '카드' | '현금', cashReceiptIssued: boolean) => {
        setMemberships(prev => {
            const startDate = new Date(startDateStr);
            // 날짜 계산: 시작일을 기준으로 기간을 더하고 규칙에 따라 1일 또는 2일을 뺍니다.
            const endDate = calculateEndDate(startDate, passType);

            // 이전 멤버십 확인 (할인 적용 여부 판단용)
            const studentMemberships = prev.filter(m => m.studentId === studentId);
            // 종료일 기준 내림차순 정렬하여 가장 최근 이용권 확인
            const lastMembership = studentMemberships.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0];

            let price = PASS_PRICES[passType];

            // 할인 로직 수정:
            // 1. 새로 등록하는 이용권이 원데이/1주일권이면 할인 제외 (PassType 확인)
            // 2. 직전 이용권이 원데이/1주일권이면 할인 제외 (lastMembership 확인)
            const isNewPassShortTerm = passType === PassType.ONE_DAY || passType === PassType.ONE_WEEK;
            const isPrevPassShortTerm = lastMembership && (lastMembership.passType === PassType.ONE_DAY || lastMembership.passType === PassType.ONE_WEEK);

            if (!isNewPassShortTerm && !isPrevPassShortTerm) {
                price -= 10000;
            }

            const newMembership: Membership = {
                id: crypto.randomUUID(),
                studentId,
                passType,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                price: price, // 계산된 가격 적용
                paymentDate: new Date(paymentDateStr).toISOString(),
                paymentMethod,
                cashReceiptIssued: paymentMethod === '현금' ? cashReceiptIssued : false,
            };

            return [...prev, newMembership];
        });
    }, []);

    const upgradeMembership = useCallback((originalMembershipId: string, newPassType: PassType, paymentMethod: '카드' | '현금', cashReceiptIssued: boolean) => {
        setMemberships(prev => {
            const original = prev.find(m => m.id === originalMembershipId);
            if (!original) return prev;

            const newFullPrice = PASS_PRICES[newPassType];
            // 차액 계산: 새 이용권 정가 - 기존 이용권 실 결제금액
            const upgradeCost = newFullPrice - original.price;

            if (upgradeCost < 0) {
                alert("변경하려는 이용권의 가격이 현재 이용권보다 저렴합니다. 업그레이드는 더 높은 가격의 이용권으로만 가능합니다.");
                return prev;
            }

            const today = new Date();
            const paymentDateStr = today.toISOString();

            // 1. 기존 멤버십 만료 처리 (어제 날짜로 종료)
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            const updatedOriginal = {
                ...original,
                endDate: yesterday.toISOString(),
                // 가격 정보는 그대로 두어 과거 매출 기록 유지
            };

            // 2. 새 멤버십 생성
            // 시작일은 기존 멤버십의 시작일을 유지
            const originalStartDate = new Date(original.startDate);
            // 종료일은 기존 시작일 기준으로 새 이용권 기간만큼 계산
            const newEndDate = calculateEndDate(originalStartDate, newPassType);

            const newMembership: Membership = {
                id: crypto.randomUUID(),
                studentId: original.studentId,
                passType: newPassType,
                startDate: original.startDate, // 중요: 시작일 유지
                endDate: newEndDate.toISOString(),
                price: upgradeCost, // 매출은 차액만큼만 잡힘
                paymentDate: paymentDateStr,
                paymentMethod,
                cashReceiptIssued: paymentMethod === '현금' ? cashReceiptIssued : false,
            };

            // 기존 리스트에서 원본을 업데이트된 것으로 교체하고, 새 멤버십 추가
            alert("이용권이 성공적으로 업그레이드 되었습니다.");
            return prev.map(m => m.id === originalMembershipId ? updatedOriginal : m).concat(newMembership);
        });
    }, []);

    const deleteStudent = useCallback((studentIdToDelete: string) => {
        setStudents(prevStudents => prevStudents.filter(student => student.id !== studentIdToDelete));
        setMemberships(prevMemberships => prevMemberships.filter(membership => membership.studentId !== studentIdToDelete));
        setAttendance(prevAttendance => prevAttendance.filter(record => record.studentId !== studentIdToDelete));
    }, []);
    
    const updateStudentAndMembership = useCallback((
        studentId: string,
        membershipId: string,
        updatedStudentData: Partial<Omit<Student, 'id'>>,
        updatedMembershipData: Partial<Omit<Membership, 'id' | 'studentId'>>
    ) => {
        setStudents(prev => prev.map(s => s.id === studentId ? { ...s, ...updatedStudentData } : s));
        
        setMemberships(prev => prev.map(m => {
            if (m.id !== membershipId) return m;

            // Merge original data with new updates to get the full picture
            const newFullMembershipData = { ...m, ...updatedMembershipData };

            // Determine the correct start date and pass type for calculation
            const startDate = new Date(newFullMembershipData.startDate);
            const passType = newFullMembershipData.passType;

            // Calculate the base end date from the start date and pass duration, ignoring any previous holds.
            // Note: For edits, we stick to calculating from Start Date as we don't track which logic was used initially easily,
            // or we assume user is manually adjusting if they are editing dates.
            const baseEndDate = calculateEndDate(startDate, passType);

            // Apply the new hold duration to the fresh base end date.
            let finalEndDate = baseEndDate;
            if (newFullMembershipData.holdStartDate && newFullMembershipData.holdEndDate) {
                const holdStart = new Date(newFullMembershipData.holdStartDate);
                const holdEnd = new Date(newFullMembershipData.holdEndDate);
                if (holdEnd >= holdStart) {
                    // +1 because hold period is inclusive (e.g., holding from Mon to Tue is 2 days)
                    const holdDuration = Math.ceil((holdEnd.getTime() - holdStart.getTime()) / (1000 * 3600 * 24)) + 1;
                    // Create a new date object from baseEndDate to avoid mutation issues
                    finalEndDate = new Date(baseEndDate.getTime());
                    finalEndDate.setDate(baseEndDate.getDate() + holdDuration);
                }
            }

            // Set the correctly calculated end date
            newFullMembershipData.endDate = finalEndDate.toISOString();
            
            // If passType was changed, the price needs to be updated too.
            // 주의: 수정 시에는 재등록 할인이 풀릴 수 있음 (정책 결정 필요). 현재는 정가로 리셋.
            if (updatedMembershipData.passType) {
                 newFullMembershipData.price = PASS_PRICES[passType];
            }

            // If payment method is card, cash receipt is always false.
            if (newFullMembershipData.paymentMethod === '카드') {
                newFullMembershipData.cashReceiptIssued = false;
            }

            return newFullMembershipData;
        }));
    }, []);

    const bulkExtendMemberships = useCallback((days: number, reason: string) => {
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
        
        setMemberships(prevMemberships =>
            prevMemberships.map(m => {
                if (studentIdsToUpdate.has(m.studentId)) {
                    const newEndDate = new Date(m.endDate);
                    newEndDate.setDate(newEndDate.getDate() + days);
                    return { ...m, endDate: newEndDate.toISOString() };
                }
                return m;
            })
        );
    
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
        
        alert(`${studentIdsToUpdate.size}명의 활성 회원 이용권이 ${days}일 연장되었습니다.`);
    }, [memberships]);

    const importStudentsAndMemberships = (data: any[]) => {
        let addedCount = 0;
        let updatedCount = 0;

        const newStudents = [...students];
        const newMemberships = [...memberships];

        data.forEach(item => {
            const studentId = item.student_id;
            if (!studentId || !item.student_name) {
                console.warn('Skipping invalid row during import (missing student_id or student_name):', item);
                return;
            }

            const studentData: Student = {
                id: studentId,
                name: item.student_name,
                phone: item.student_phone || '',
                registrationDate: item.student_registrationDate || new Date().toISOString(),
                remarks: item.student_remarks || '',
            };

            const membershipData: Membership | null = item.membership_passType ? {
                id: item.membership_id || crypto.randomUUID(),
                studentId: studentId,
                passType: item.membership_passType as PassType,
                startDate: item.membership_startDate || new Date().toISOString(),
                endDate: item.membership_endDate || new Date().toISOString(),
                price: Number(item.membership_price) || 0,
                paymentDate: item.membership_paymentDate || item.membership_startDate || new Date().toISOString(),
                paymentMethod: (item.membership_paymentMethod === '카드' || item.membership_paymentMethod === '현금') ? item.membership_paymentMethod : '카드',
                cashReceiptIssued: item.membership_cashReceiptIssued === 'true' || item.membership_cashReceiptIssued === true,
                holdStartDate: item.membership_holdStartDate || undefined,
                holdEndDate: item.membership_holdEndDate || undefined,
            } : null;

            const studentIndex = newStudents.findIndex(s => s.id === studentId);
            
            if (studentIndex > -1) {
                // Update
                newStudents[studentIndex] = studentData;
                if (membershipData) {
                    const membershipIndex = newMemberships.findIndex(m => m.studentId === studentId);
                    if (membershipIndex > -1) {
                        membershipData.id = item.membership_id || newMemberships[membershipIndex].id;
                        newMemberships[membershipIndex] = { ...newMemberships[membershipIndex], ...membershipData };
                    } else {
                        newMemberships.push(membershipData);
                    }
                }
                updatedCount++;
            } else {
                // Add
                newStudents.push(studentData);
                if (membershipData) {
                    newMemberships.push(membershipData);
                }
                addedCount++;
            }
        });

        setStudents(newStudents);
        setMemberships(newMemberships);
        alert(`${addedCount}명의 신규 회원을 등록하고 ${updatedCount}명의 회원 정보를 업데이트했습니다.`);
    };

    const toggleAttendance = (studentId: string, date: string, classTime: string) => {
        const existingRecord = attendance.find(a => a.studentId === studentId && a.date === date && a.classTime === classTime);
        if (existingRecord) {
            setAttendance(prev => prev.filter(a => a.id !== existingRecord.id));
        } else {
            setAttendance(prev => [...prev, { id: crypto.randomUUID(), studentId, date, classTime }]);
        }
    };

    const addExpense = (expenseData: Omit<Expense, 'id'>) => {
        setExpenses(prev => [...prev, { ...expenseData, id: crypto.randomUUID() }]);
    };

    const deleteExpense = (expenseId: string) => {
        setExpenses(prev => prev.filter(e => e.id !== expenseId));
    };

    const addOrUpdateSchedule = (classData: ClassSchedule) => {
        setSchedule(prev => {
            const existing = prev.find(c => c.id === classData.id);
            if (existing) {
                return prev.map(c => c.id === classData.id ? classData : c);
            }
            return [...prev, classData];
        });
    };

    const deleteSchedule = (classId: string) => {
        setSchedule(prev => prev.filter(c => c.id !== classId));
    };

    const renderView = () => {
        switch (view) {
            case 'dashboard':
                return <Dashboard students={students} memberships={memberships} expenses={expenses} attendance={attendance} schedule={schedule} />;
            case 'students':
                return <StudentManager students={students} memberships={memberships} addStudent={addStudent} deleteStudent={deleteStudent} updateStudentAndMembership={updateStudentAndMembership} bulkExtendMemberships={bulkExtendMemberships} importStudentsAndMemberships={importStudentsAndMemberships} addMembership={addMembership} upgradeMembership={upgradeMembership} />;
            case 'schedule':
                return <ScheduleManager students={students} memberships={memberships} attendance={attendance} toggleAttendance={toggleAttendance} schedule={schedule} addOrUpdateSchedule={addOrUpdateSchedule} deleteSchedule={deleteSchedule} />;
            case 'expenses':
                return <ExpenseManager expenses={expenses} addExpense={addExpense} deleteExpense={deleteExpense} />;
            case 'financials':
                return <FinancialReport memberships={memberships} expenses={expenses} students={students} />;
            default:
                return <Dashboard students={students} memberships={memberships} expenses={expenses} attendance={attendance} schedule={schedule} />;
        }
    };

    return (
        <div className="bg-gray-100 min-h-screen">
            <div className="md:flex">
                <aside className="w-full md:w-64 bg-gray-800 text-white flex flex-col">
                    <div className="p-6 text-2xl font-bold border-b border-gray-700">
                        🧘‍♀️ Yogao Studio
                    </div>
                    <nav className="flex-1">
                        <NavItem icon={<DashboardIcon className="w-5 h-5"/>} label="대시보드" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
                        <NavItem icon={<StudentsIcon className="w-5 h-5"/>} label="회원 관리" active={view === 'students'} onClick={() => setView('students')} />
                        <NavItem icon={<AttendanceIcon className="w-5 h-5"/>} label="시간표 & 출결" active={view === 'schedule'} onClick={() => setView('schedule')} />
                        <NavItem icon={<ExpenseIcon className="w-5 h-5"/>} label="가계부" active={view === 'expenses'} onClick={() => setView('expenses')} />
                        <NavItem icon={<FinancialsIcon className="w-5 h-5"/>} label="재무 리포트" active={view === 'financials'} onClick={() => setView('financials')} />
                    </nav>
                </aside>
                <main className="flex-1 p-6 md:p-10">
                    {renderView()}
                </main>
            </div>
        </div>
    );
};

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick }) => (
    <a
        href="#"
        onClick={(e) => { e.preventDefault(); onClick(); }}
        className={`flex items-center px-6 py-4 text-sm font-medium transition-colors duration-200 ${
            active
                ? 'bg-gray-900 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }`}
    >
        {icon}
        <span className="ml-3">{label}</span>
    </a>
);

export default App;
