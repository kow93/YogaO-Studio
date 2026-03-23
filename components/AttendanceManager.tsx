import React, { useState, useMemo, useCallback } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { Student, AttendanceRecord, Membership, ClassSchedule } from '../types';
import { CLASS_COLORS } from '../constants';
import { PlusIcon } from './icons';
import { ClassAttendanceModal } from './ClassAttendanceModal';
import { AddEditClassModal } from './AddEditClassModal';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Seoul');

interface AttendanceManagerProps {
    students: Student[];
    attendance: AttendanceRecord[];
    memberships?: Membership[];
    schedule?: ClassSchedule[];
    toggleAttendance?: (studentId: string, date: string, classTime: string, classId?: string) => void;
    isSubmittingAttendance?: boolean;
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

const ClassBlock: React.FC<{
    classItem: ClassSchedule;
    dayIndex: number;
    startOfWeek: dayjs.Dayjs;
    attendance: AttendanceRecord[];
    onClick: () => void;
    onEdit: (e: React.MouseEvent) => void;
}> = React.memo(({ classItem, dayIndex, startOfWeek, attendance, onClick, onEdit }) => {
    const [startHour, startMinute] = classItem.startTime?.split(':')?.map(Number) || [0, 0];
    const [endHour, endMinute] = classItem.endTime?.split(':')?.map(Number) || [0, 0];
    const totalStartMinutes = startHour * 60 + startMinute;
    const totalEndMinutes = endHour * 60 + endMinute;
    const top = ((totalStartMinutes - HOURS[0] * 60) / ((HOURS.length) * 60)) * 100;
    const height = ((totalEndMinutes - totalStartMinutes) / ((HOURS.length) * 60)) * 100;
    const colorClasses = CLASS_COLORS[classItem.color]?.classes || CLASS_COLORS['blue'].classes;
    const classDate = startOfWeek.add(dayIndex, 'day');
    const dateString = classDate.format('YYYY-MM-DD');
    
    const attendanceCount = useMemo(() => {
        return attendance.filter(a => {
            const aDate = dayjs(a.date).format('YYYY-MM-DD');
            return aDate === dateString && a.classId === classItem.id;
        }).length;
    }, [attendance, dateString, classItem.id]);

    return (
        <div
            className={`absolute w-[95%] left-[2.5%] p-3 rounded-xl border text-xs cursor-pointer shadow-sm transition-all hover:scale-[1.02] hover:shadow-md ${colorClasses} overflow-hidden`}
            style={{ top: `${top}%`, height: `${height}%` }}
            onClick={onClick}
        >
            <div className="flex justify-between items-start">
                <p className="font-bold text-sm truncate">{classItem.className}</p>
                <button onClick={onEdit} className="p-1 hover:bg-black/5 rounded-md transition-colors">
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
});

export const AttendanceManager: React.FC<AttendanceManagerProps> = (props) => {
    const { students, attendance, memberships = [], schedule = [], toggleAttendance, addOrUpdateSchedule, deleteSchedule } = props;
    const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('monthly');
    const [currentDate, setCurrentDate] = useState(dayjs());
    const [modalInfo, setModalInfo] = useState<{ type: 'attendance' | 'edit'; data: any } | null>(null);

    // Optimized attendance lookup
    const attendanceByDate = useMemo(() => {
        const map = new Map<string, number>();
        attendance.forEach(a => {
            const dateStr = dayjs(a.date).format('YYYY-MM-DD');
            map.set(dateStr, (map.get(dateStr) || 0) + 1);
        });
        return map;
    }, [attendance]);

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

    // Weekly View Logic
    const startOfWeek = useMemo(() => getStartOfWeek(currentDate), [currentDate]);

    const handleClassClick = useCallback((classItem: ClassSchedule, dayIndex: number) => {
        const classDate = startOfWeek.add(dayIndex, 'day');
        setModalInfo({ type: 'attendance', data: { classItem, date: classDate } });
    }, [startOfWeek]);
    
    const handleEmptySlotClick = useCallback((dayIndex: number, hour: number) => {
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
    }, []);
    
    const handleEditClick = useCallback((e: React.MouseEvent, classItem: ClassSchedule) => {
        e.stopPropagation();
        setModalInfo({ type: 'edit', data: { classItem, isNew: false } });
    }, []);

    const handleSaveClass = useCallback((classData: ClassSchedule) => {
        if (addOrUpdateSchedule) addOrUpdateSchedule(classData);
        setModalInfo(null);
    }, [addOrUpdateSchedule]);

    const handleDeleteClass = useCallback((classId: string) => {
        if (deleteSchedule) deleteSchedule(classId);
        setModalInfo(null);
    }, [deleteSchedule]);

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
                            const dateStr = day.format('YYYY-MM-DD');
                            const count = attendanceByDate.get(dateStr) || 0;
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
                                {schedule.filter(c => c.dayOfWeek === dayIndex + 1).map(c => (
                                    <ClassBlock 
                                        key={c.id}
                                        classItem={c}
                                        dayIndex={dayIndex}
                                        startOfWeek={startOfWeek}
                                        attendance={attendance}
                                        onClick={() => handleClassClick(c, dayIndex)}
                                        onEdit={(e) => handleEditClick(e, c)}
                                    />
                                ))}
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
                    isSubmitting={props.isSubmittingAttendance}
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

