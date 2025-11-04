import React, { useState } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Student, Membership, AttendanceRecord, ViewType, PassType, Expense, ExpenseCategory } from './types';
import { PASS_PRICES, PASS_DURATIONS_DAYS } from './constants';
import { Dashboard } from './components/Dashboard';
import { StudentManager } from './components/StudentManager';
import { AttendanceTracker } from './components/AttendanceTracker';
import { ExpenseManager } from './components/ExpenseManager';
import { DashboardIcon, StudentsIcon, AttendanceIcon, ExpenseIcon } from './components/icons';

const App: React.FC = () => {
    const [view, setView] = useState<ViewType>('dashboard');
    const [students, setStudents] = useLocalStorage<Student[]>('students', []);
    const [memberships, setMemberships] = useLocalStorage<Membership[]>('memberships', []);
    const [attendance, setAttendance] = useLocalStorage<AttendanceRecord[]>('attendance', []);
    const [expenses, setExpenses] = useLocalStorage<Expense[]>('expenses', []);

    const addStudent = (studentData: Omit<Student, 'id' | 'registrationDate'>, passType: PassType, startDateStr: string, paymentMethod: '카드' | '현금', cashReceiptIssued: boolean) => {
        const studentId = Date.now().toString();
        const registrationDate = new Date().toISOString();
        const newStudent: Student = { ...studentData, id: studentId, registrationDate };

        const startDate = new Date(startDateStr);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + PASS_DURATIONS_DAYS[passType] - 1);

        const newMembership: Membership = {
            id: `m-${studentId}`,
            studentId,
            passType,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            price: PASS_PRICES[passType],
            paymentMethod,
            cashReceiptIssued: paymentMethod === '현금' ? cashReceiptIssued : undefined,
        };

        setStudents(prev => [...prev, newStudent]);
        setMemberships(prev => [...prev, newMembership]);
    };

    const deleteStudent = (studentId: string) => {
        setStudents(prev => prev.filter(s => s.id !== studentId));
        setMemberships(prev => prev.filter(m => m.studentId !== studentId));
        setAttendance(prev => prev.filter(a => a.studentId !== studentId));
    };
    
    const updateStudentAndMembership = (
        studentId: string,
        updatedStudentData: Partial<Omit<Student, 'id'>>,
        updatedMembershipData: Partial<Omit<Membership, 'id' | 'studentId'>>
    ) => {
        setStudents(prev =>
            prev.map(s => (s.id === studentId ? { ...s, ...updatedStudentData } : s))
        );
        setMemberships(prev =>
            prev.map(m => {
                if (m.studentId !== studentId) return m;

                const originalMembership = { ...m };
                const newFullMembership = { ...originalMembership, ...updatedMembershipData };

                let newEndDate = new Date(originalMembership.endDate);

                // Recalculate end date if pass or start date changes
                if (updatedMembershipData.passType || updatedMembershipData.startDate) {
                    const newStartDate = new Date(newFullMembership.startDate);
                    const duration = PASS_DURATIONS_DAYS[newFullMembership.passType];
                    newEndDate = new Date(newStartDate);
                    newEndDate.setDate(newStartDate.getDate() + duration - 1);
                    newFullMembership.price = PASS_PRICES[newFullMembership.passType];
                }

                // Add hold duration to the (potentially new) end date
                if (updatedMembershipData.holdStartDate && updatedMembershipData.holdEndDate) {
                    const holdStart = new Date(updatedMembershipData.holdStartDate);
                    const holdEnd = new Date(updatedMembershipData.holdEndDate);
                    
                    if (holdEnd >= holdStart) {
                        const holdDuration = Math.ceil((holdEnd.getTime() - holdStart.getTime()) / (1000 * 3600 * 24)) + 1;
                        newEndDate.setDate(newEndDate.getDate() + holdDuration);
                    }
                }
                
                newFullMembership.endDate = newEndDate.toISOString();
                
                if (newFullMembership.paymentMethod === '카드') {
                    delete newFullMembership.cashReceiptIssued;
                }

                return newFullMembership;
            })
        );
    };

    const toggleAttendance = (studentId: string, date: string, classTime: string) => {
        const recordExists = attendance.some(a => a.studentId === studentId && a.date === date && a.classTime === classTime);
        if (recordExists) {
            setAttendance(prev => prev.filter(a => !(a.studentId === studentId && a.date === date && a.classTime === classTime)));
        } else {
            setAttendance(prev => [...prev, { studentId, date, classTime }]);
        }
    };

    const addExpense = (expenseData: Omit<Expense, 'id'>) => {
        const newExpense: Expense = { ...expenseData, id: Date.now().toString() };
        setExpenses(prev => [...prev, newExpense]);
    };

    const deleteExpense = (expenseId: string) => {
        setExpenses(prev => prev.filter(e => e.id !== expenseId));
    };
    
    const renderView = () => {
        switch (view) {
            case 'dashboard':
                return <Dashboard students={students} memberships={memberships} expenses={expenses} />;
            case 'students':
                return <StudentManager students={students} memberships={memberships} addStudent={addStudent} deleteStudent={deleteStudent} updateStudentAndMembership={updateStudentAndMembership} />;
            case 'attendance':
                return <AttendanceTracker students={students} memberships={memberships} attendance={attendance} toggleAttendance={toggleAttendance} />;
            case 'expenses':
                return <ExpenseManager expenses={expenses} addExpense={addExpense} deleteExpense={deleteExpense} />;
            default:
                return <Dashboard students={students} memberships={memberships} expenses={expenses} />;
        }
    };

    return (
        <div className="bg-gray-100 min-h-screen">
            <div className="md:flex">
                <aside className="w-full md:w-64 bg-gray-800 text-white">
                    <div className="p-6 text-2xl font-bold border-b border-gray-700">
                        🧘‍♀️ Yogao Studio
                    </div>
                    <nav>
                        <NavItem icon={<DashboardIcon className="w-5 h-5"/>} label="대시보드" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
                        <NavItem icon={<StudentsIcon className="w-5 h-5"/>} label="회원 관리" active={view === 'students'} onClick={() => setView('students')} />
                        <NavItem icon={<AttendanceIcon className="w-5 h-5"/>} label="출결 관리" active={view === 'attendance'} onClick={() => setView('attendance')} />
                        <NavItem icon={<ExpenseIcon className="w-5 h-5"/>} label="가계부" active={view === 'expenses'} onClick={() => setView('expenses')} />
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