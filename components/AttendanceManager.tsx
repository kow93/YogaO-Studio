import React, { useState, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { Student, AttendanceRecord, Membership, ClassSchedule } from '../types';
import { CLASS_COLORS } from '../constants';
import { SearchIcon, CloseIcon, PlusIcon } from './icons';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Seoul');

interface AttendanceManagerProps {
    students: Student[];
    attendance: AttendanceRecord[];
    memberships?: Membership[];
    schedule?: ClassSchedule[];
    toggleAttendance?: (studentId: string, date: string, classTime: string, classId?: string) => void;
    addOrUpdateSchedule?: (classData: ClassSchedule) => void;
    deleteSchedule?: (classId: string) => void;
    updateStudent?: (studentId: string, updates: Partial<Student>) => void;
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const WEEK_DAYS = ['월', '화', '수', '목', '금', '토'];
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM to 10 PM

const getStartOfWeek = (date: dayjs.Dayjs) => {
    return date.startOf('week').add(1, 'day'); // Monday
};

const isLooseMatch = (record: AttendanceRecord, classItem: ClassSchedule, targetDate: string) => {
    const toISODate = (d: any) => {
        if (!d) return '';
        const parsed = dayjs(d);
        return parsed.isValid() ? parsed.format('YYYY-MM-DD') : '';
    };

    const rDate = toISODate((record as any).attendance_date || (record as any)['출석 날짜'] || record.date);
    const tDate = toISODate(targetDate);

    if (!rDate || !tDate || rDate !== tDate) return false;

    const rawDbInfo = String((record as any).class_info || (record as any)['수업 시간 정보'] || record.classTime || '');
    const targetClassInfo = `${classItem.startTime} - ${classItem.className}`;
    
    // 1순위: 정확한 classId 매칭 (가장 확실함)
    if (record.classId && classItem.id && record.classId === classItem.id) return true;

    // 2순위: 정확한 class_info 매칭
    if (rawDbInfo === targetClassInfo) return true;
    
    // 3순위: 과거 데이터 호환성 (공백 무시 부분 일치)
    const dbInfoNoSpace = rawDbInfo.replace(/\s/g, '');
    const targetName = (classItem.className || '').replace(/\s/g, '');
    const targetTime = classItem.startTime || '';
    
    if (!targetName || !targetTime) return false;
    
    return rawDbInfo.includes(targetTime) && dbInfoNoSpace.includes(targetName);
};

export const AttendanceManager: React.FC<AttendanceManagerProps> = (props) => {
    const { students, attendance, memberships = [], schedule = [], toggleAttendance, addOrUpdateSchedule, deleteSchedule } = props;
    const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('monthly');
    const [currentDate, setCurrentDate] = useState(dayjs());
    const [modalInfo, setModalInfo] = useState<{ type: 'attendance' | 'edit'; data: any } | null>(null);

    // Monthly View Logic
    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');
    const startCalendar = startOfMonth.startOf('week');
    const endCalendar = endOfMonth.endOf('week');

    const calendarDays = useMemo(() => {
        const days = [];
        let day = startCalendar;
        while (day.isBefore(endCalendar) || day.isSame(endCalendar, 'day')) {
            days.push(day);
            day = day.add(1, 'day');
        }
        return days;
    }, [startCalendar, endCalendar]);

    const getDailyAttendanceCount = (date: dayjs.Dayjs) => {
        const dateStr = date.tz('Asia/Seoul').format('YYYY-MM-DD');
        return attendance.filter((a: any) => {
            const rawDate = a.attendance_date || a['출석 날짜'] || a.date || '';
            if (!rawDate) return false;
            
            const parsed = dayjs(rawDate).tz('Asia/Seoul');
            return parsed.isValid() && parsed.format('YYYY-MM-DD') === dateStr;
        }).length;
    };

    // Weekly View Logic
    const startOfWeek = getStartOfWeek(currentDate);

    const handleClassClick = (classItem: ClassSchedule, dayIndex: number) => {
        const classDate = startOfWeek.add(dayIndex, 'day');
        setModalInfo({ type: 'attendance', data: { classItem, date: classDate } });
    };
    
    const handleEmptySlotClick = (dayIndex: number, hour: number) => {
         const newId = `cls-${crypto.randomUUID()}`;
         const startTime = `${hour.toString().padStart(2, '0')}:00`;
         const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
         const newClass: ClassSchedule = {
            id: newId,
            dayOfWeek: dayIndex + 1,
            startTime,
            endTime,
            className: '',
            color: 'blue'
         };
        setModalInfo({ type: 'edit', data: { classItem: newClass, isNew: true } });
    };
    
    const handleEditClick = (e: React.MouseEvent, classItem: ClassSchedule) => {
        e.stopPropagation();
        setModalInfo({ type: 'edit', data: { classItem, isNew: false } });
    };

    const handleSaveClass = (classData: ClassSchedule) => {
        if (addOrUpdateSchedule) addOrUpdateSchedule(classData);
        setModalInfo(null);
    };

    const handleDeleteClass = (classId: string) => {
        if (deleteSchedule) deleteSchedule(classId);
        setModalInfo(null);
    };

    const renderClassBlock = (classItem: ClassSchedule, dayIndex: number) => {
        const [startHour, startMinute] = classItem.startTime?.split(':')?.map(Number) || [0, 0];
        const [endHour, endMinute] = classItem.endTime?.split(':')?.map(Number) || [0, 0];
        const totalStartMinutes = startHour * 60 + startMinute;
        const totalEndMinutes = endHour * 60 + endMinute;
        const top = ((totalStartMinutes - HOURS[0] * 60) / ((HOURS.length) * 60)) * 100;
        const height = ((totalEndMinutes - totalStartMinutes) / ((HOURS.length) * 60)) * 100;
        const colorClasses = CLASS_COLORS[classItem.color]?.classes || CLASS_COLORS['blue'].classes;
        const classDate = startOfWeek.add(dayIndex, 'day');
        const dateString = classDate.format('YYYY-MM-DD');
        
        const attendanceCount = attendance.filter(a => isLooseMatch(a, classItem, dateString)).length;

        return (
            <div
                key={classItem.id}
                className={`absolute w-[95%] left-[2.5%] p-3 rounded-xl border text-xs cursor-pointer shadow-sm transition-all hover:scale-[1.02] hover:shadow-md ${colorClasses} overflow-hidden`}
                style={{ top: `${top}%`, height: `${height}%` }}
                onClick={() => handleClassClick(classItem, dayIndex)}
            >
                <div className="flex justify-between items-start">
                    <p className="font-bold text-sm truncate">{classItem.className}</p>
                    <button onClick={(e) => handleEditClick(e, classItem)} className="p-1 hover:bg-black/5 rounded-md transition-colors">
                        <PlusIcon className="w-3 h-3 rotate-45" />
                    </button>
                </div>
                <p className="opacity-80 font-medium">{classItem.startTime} - {classItem.endTime}</p>
                {attendanceCount > 0 && (
                    <div className="absolute bottom-2 right-2 text-[10px] font-bold bg-white/80 text-gray-800 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/50">
                        {attendanceCount}명 출석
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">출결 관리</h2>
                    <p className="text-gray-500 mt-1">월별 및 주간 수업 일정 관리</p>
                </div>
                <div className="flex gap-3">
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button 
                            onClick={() => setViewMode('monthly')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'monthly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            월간
                        </button>
                        <button 
                            onClick={() => setViewMode('weekly')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'weekly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            주간
                        </button>
                    </div>
                    <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                        <button onClick={() => setCurrentDate(d => viewMode === 'monthly' ? d.subtract(1, 'month') : d.subtract(7, 'day'))} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400">&lt;</button>
                        <span className="px-4 text-sm font-bold text-gray-900">
                            {viewMode === 'monthly' 
                                ? currentDate.format('YYYY년 MM월') 
                                : `${startOfWeek.format('MM.DD')} ~ ${startOfWeek.add(5, 'day').format('MM.DD')}`}
                        </span>
                        <button onClick={() => setCurrentDate(d => viewMode === 'monthly' ? d.add(1, 'month') : d.add(7, 'day'))} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400">&gt;</button>
                    </div>
                </div>
            </div>

            {viewMode === 'monthly' ? (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
                        {DAYS.map(day => (
                            <div key={day} className="py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                                {day}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 auto-rows-[120px]">
                        {calendarDays.map((day, i) => {
                            const isCurrentMonth = day.month() === currentDate.month();
                            const isToday = day.isSame(dayjs(), 'day');
                            const count = getDailyAttendanceCount(day);
                            const dayOfWeek = day.day();
                            const dayClasses = schedule.filter(c => c.dayOfWeek === dayOfWeek);

                            return (
                                <div 
                                    key={i} 
                                    onClick={() => {
                                        setCurrentDate(day);
                                        setViewMode('weekly');
                                    }}
                                    className={`border-b border-r border-gray-50 p-2 transition-all cursor-pointer hover:bg-gray-50 relative group ${!isCurrentMonth ? 'bg-gray-50/30 text-gray-300' : 'bg-white'}`}
                                >
                                    <div className={`text-sm font-bold mb-1 flex justify-between items-center ${isToday ? 'text-indigo-600' : 'text-gray-700'}`}>
                                        <span className={isToday ? 'bg-indigo-50 px-2 py-0.5 rounded-md' : ''}>
                                            {day.date()}
                                        </span>
                                    </div>
                                    
                                    {isCurrentMonth && dayClasses.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            <div className="text-[10px] font-medium text-gray-500 truncate px-1">
                                                {dayClasses.length}개 수업
                                            </div>
                                            {count > 0 && (
                                                <div className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                                                    {count}명 출석
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="grid grid-cols-[80px_repeat(6,1fr)] min-w-[900px]">
                        <div className="bg-gray-50/50 border-r border-b border-gray-100"></div>
                        {WEEK_DAYS.map((day, i) => {
                            const d = startOfWeek.add(i, 'day');
                            return (
                                 <div key={day} className="text-center py-4 border-b border-gray-100 bg-gray-50/50">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{day}</div>
                                    <div className="text-sm font-bold text-gray-900">{d.date()}일</div>
                                </div>
                            )
                        })}
                        
                        <div className="border-r border-gray-100">
                            {HOURS.map(hour => (
                                <div key={hour} className="h-28 flex justify-center items-start pt-2 border-b border-gray-50">
                                    <span className="text-[10px] font-bold text-gray-300">{hour}:00</span>
                                </div>
                            ))}
                        </div>

                        {WEEK_DAYS.map((_, dayIndex) => (
                            <div key={dayIndex} className="relative border-r border-gray-100">
                                {HOURS.map(hour => (
                                    <div key={hour} onClick={() => handleEmptySlotClick(dayIndex, hour)} className="h-28 border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer group flex items-center justify-center">
                                        <PlusIcon className="w-4 h-4 text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                ))}
                                {schedule.filter(c => c.dayOfWeek === dayIndex + 1).map(c => renderClassBlock(c, dayIndex))}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {modalInfo?.type === 'attendance' && 
                <ClassAttendanceModal 
                    isOpen={true} 
                    onClose={() => setModalInfo(null)}
                    students={students}
                    memberships={memberships}
                    attendance={attendance}
                    toggleAttendance={toggleAttendance}
                    updateStudent={props.updateStudent}
                    classInfo={modalInfo.data}
                />
            }
            {modalInfo?.type === 'edit' &&
                <AddEditClassModal
                    isOpen={true}
                    onClose={() => setModalInfo(null)}
                    onSave={handleSaveClass}
                    onDelete={handleDeleteClass}
                    classData={modalInfo.data.classItem}
                    isNew={modalInfo.data.isNew}
                />
            }
        </div>
    );
};

const ClassAttendanceModal: React.FC<{
    isOpen: boolean; 
    onClose: () => void; 
    students: Student[];
    memberships: Membership[];
    attendance: AttendanceRecord[];
    toggleAttendance?: any;
    updateStudent?: (studentId: string, updates: Partial<Student>) => void;
    classInfo: { classItem: ClassSchedule, date: dayjs.Dayjs } 
}> = ({ isOpen, onClose, students, memberships, attendance, toggleAttendance, updateStudent, classInfo }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const { classItem, date } = classInfo;
    const dateString = date.format('YYYY-MM-DD');
    const classTimeString = `${classItem.startTime} - ${classItem.className}`;

    const displayStudents = useMemo(() => {
        const targetDate = date.tz('Asia/Seoul').startOf('day');
        
        // 1. Get active students
        const active = students.filter(student => {
            const studentMemberships = memberships.filter(m => m.studentId === student.id);
            return studentMemberships.some(membership => {
                const startDate = dayjs(membership.startDate).tz('Asia/Seoul').startOf('day');
                const endDate = dayjs(membership.endDate).tz('Asia/Seoul').startOf('day');
                
                if (membership.holdStartDate && membership.holdEndDate) {
                    const holdStart = dayjs(membership.holdStartDate).tz('Asia/Seoul').startOf('day');
                    const holdEnd = dayjs(membership.holdEndDate).tz('Asia/Seoul').startOf('day');
                    if ((targetDate.isAfter(holdStart) || targetDate.isSame(holdStart)) && (targetDate.isBefore(holdEnd) || targetDate.isSame(holdEnd))) return false;
                }
                return (targetDate.isAfter(startDate) || targetDate.isSame(startDate)) && (targetDate.isBefore(endDate) || targetDate.isSame(endDate)) && !membership.refundAmount;
            });
        });

        // 2. Get attended students for this specific class
        const attended = attendance
            .filter(a => isLooseMatch(a, classItem, dateString))
            .map(a => {
                const s = students.find(s => s.id === a.studentId);
                return s || { 
                    id: a.studentId || `temp-${a.id}`, 
                    name: (a as any).name || a.studentName || (a as any)['이름'] || 'Unknown', 
                    phone: (a as any).phone || a.studentPhone || (a as any)['연락처'] || '', 
                    registrationDate: '' 
                };
            });

        // 3. Merge and deduplicate
        const studentMap = new Map<string, Student>();
        active.forEach(s => studentMap.set(s.id, s));
        attended.forEach(s => studentMap.set(s.id, s as Student));

        return Array.from(studentMap.values())
            .filter(s => (s.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()))
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            
    }, [students, memberships, date, searchTerm, attendance, dateString, classItem]);
    
    const getAttendanceRecord = (studentId: string) => attendance.find(a => {
        const isStudentMatch = a.studentId === studentId;
        return isStudentMatch && isLooseMatch(a, classItem, dateString);
    });
    
    const isAttended = (studentId: string) => !!getAttendanceRecord(studentId);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{classItem.className}</h2>
                        <p className="text-sm text-gray-500 font-medium mt-1">
                            {date.format('MM월 DD일 dddd')} • {classItem.startTime}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2"><CloseIcon className="w-6 h-6" /></button>
                </div>
                <div className="relative mb-6">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="회원 이름 검색..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"/>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                    {displayStudents.map(student => {
                        const record = getAttendanceRecord(student.id);
                        return (
                            <div key={student.id} className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors space-y-3">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-gray-900">{student.name}</p>
                                        <p className="text-[10px] text-gray-400 font-medium">{student.phone}</p>
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        checked={!!record} 
                                        onChange={() => toggleAttendance && toggleAttendance(student.id, dateString, classTimeString, classItem.id, record?.id)} 
                                        className="h-6 w-6 rounded-lg border-gray-200 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <textarea
                                        placeholder="특이사항 입력..."
                                        value={student.notes || ''}
                                        onChange={(e) => updateStudent && updateStudent(student.id, { notes: e.target.value })}
                                        className="w-full text-[11px] p-2 bg-white border border-gray-100 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                                        rows={1}
                                    />
                                </div>
                            </div>
                        );
                    })}
                    {displayStudents.length === 0 && <div className="py-12 text-center text-gray-400">유효한 회원이 없습니다.</div>}
                </div>
                 <div className="pt-6 mt-auto">
                    <button onClick={onClose} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100">확인</button>
                 </div>
            </div>
        </div>
    )
}

const AddEditClassModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (classData: ClassSchedule) => void;
    onDelete: (classId: string) => void;
    classData: ClassSchedule;
    isNew: boolean;
}> = ({ isOpen, onClose, onSave, onDelete, classData, isNew }) => {
    const [formData, setFormData] = useState<ClassSchedule>(classData);
    useEffect(() => { setFormData(classData); }, [classData]);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'dayOfWeek' ? Number(value) : value }));
    };
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">{isNew ? '수업 추가' : '수업 수정'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><CloseIcon className="w-6 h-6" /></button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">수업명</label>
                        <input type="text" name="className" value={formData.className} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">요일</label>
                            <select name="dayOfWeek" value={formData.dayOfWeek} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                                {WEEK_DAYS.map((day, i) => <option key={i} value={i+1}>{day}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">색상</label>
                            <select name="color" value={formData.color} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                                {Object.entries(CLASS_COLORS).map(([key, {name}]) => <option key={key} value={key}>{name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">시작 시간</label>
                            <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required />
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">종료 시간</label>
                            <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        {!isNew && (
                            <button 
                                type="button" 
                                onClick={() => window.confirm('수업을 삭제하시겠습니까?') && onDelete(formData.id)} 
                                className="px-6 py-4 bg-rose-50 text-rose-600 rounded-2xl font-bold hover:bg-rose-100 transition-all border border-rose-100"
                            >
                                삭제
                            </button>
                        )}
                        <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100">
                            저장 완료
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
