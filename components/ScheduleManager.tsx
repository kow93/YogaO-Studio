import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, Membership, ClassSchedule } from '../types';
import { CLASS_COLORS } from '../constants';
import { CloseIcon } from './icons';

interface ScheduleManagerProps {
    students: Student[];
    memberships: Membership[];
    attendance: AttendanceRecord[];
    toggleAttendance: (studentId: string, date: string, classTime: string) => void;
    schedule: ClassSchedule[];
    addOrUpdateSchedule: (classData: ClassSchedule) => void;
    deleteSchedule: (classId: string) => void;
}

const DAYS = ['월', '화', '수', '목', '금', '토'];
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM to 10 PM (22:00)

// Helper to get the start of the week (Monday)
const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
};

export const ScheduleManager: React.FC<ScheduleManagerProps> = (props) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [modalInfo, setModalInfo] = useState<{ type: 'attendance' | 'edit'; data: any } | null>(null);

    const startOfWeek = getStartOfWeek(currentDate);

    const handleClassClick = (classItem: ClassSchedule, dayIndex: number) => {
        const classDate = new Date(startOfWeek);
        classDate.setDate(startOfWeek.getDate() + dayIndex);
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
        props.addOrUpdateSchedule(classData);
        setModalInfo(null);
    };

    const handleDeleteClass = (classId: string) => {
        if (window.confirm('이 수업을 삭제하시겠습니까?')) {
            props.deleteSchedule(classId);
            setModalInfo(null);
        }
    };
    
    const renderClassBlock = (classItem: ClassSchedule, dayIndex: number) => {
        const [startHour, startMinute] = classItem.startTime.split(':').map(Number);
        const [endHour, endMinute] = classItem.endTime.split(':').map(Number);
        const totalStartMinutes = startHour * 60 + startMinute;
        const totalEndMinutes = endHour * 60 + endMinute;

        const top = ((totalStartMinutes - HOURS[0] * 60) / ((HOURS.length) * 60)) * 100;
        const height = ((totalEndMinutes - totalStartMinutes) / ((HOURS.length) * 60)) * 100;

        const colorClasses = CLASS_COLORS[classItem.color]?.classes || CLASS_COLORS['blue'].classes;

        const classDate = new Date(startOfWeek);
        classDate.setDate(startOfWeek.getDate() + dayIndex);
        const dateString = classDate.toISOString().split('T')[0];
        const classTimeString = `${classItem.startTime} - ${classItem.className}`;
        const attendanceCount = props.attendance.filter(a =>
            a.date === dateString && a.classTime === classTimeString
        ).length;

        return (
            <div
                key={classItem.id}
                className={`absolute w-full p-2 rounded-lg border text-xs cursor-pointer ${colorClasses} overflow-hidden`}
                style={{ top: `${top}%`, height: `${height}%` }}
                onClick={() => handleClassClick(classItem, dayIndex)}
            >
                <p className="font-bold">{classItem.className}</p>
                <p>{classItem.startTime} - {classItem.endTime}</p>
                {attendanceCount > 0 && (
                    <div className="absolute top-1 right-1 text-xs font-semibold bg-white/70 text-gray-800 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                        {attendanceCount}명 출석
                    </div>
                )}
                 <button onClick={(e) => handleEditClick(e, classItem)} className="absolute bottom-1 right-1 text-xs hover:underline">편집</button>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-800">시간표 & 출결 관리</h1>
                <div className="flex items-center gap-4">
                    <button onClick={() => setCurrentDate(d => new Date(d.setDate(d.getDate() - 7)))} className="px-3 py-1 rounded bg-white border shadow-sm">&lt; 이전 주</button>
                    <span className="font-semibold">{startOfWeek.toLocaleDateString('ko-KR')} ~ {new Date(new Date(startOfWeek).setDate(startOfWeek.getDate() + 5)).toLocaleDateString('ko-KR')}</span>
                    <button onClick={() => setCurrentDate(d => new Date(d.setDate(d.getDate() + 7)))} className="px-3 py-1 rounded bg-white border shadow-sm">다음 주 &gt;</button>
                </div>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                <div className="grid grid-cols-[auto_repeat(6,1fr)] min-w-[800px]">
                    {/* Time Header */}
                    <div className="border-r border-b"></div>
                    {/* Day Headers */}
                    {DAYS.map((day, i) => {
                        const d = new Date(startOfWeek);
                        d.setDate(d.getDate() + i);
                        return (
                             <div key={day} className="text-center font-semibold p-2 border-b">
                                {day}
                                <div className="text-sm text-gray-500 font-normal">{d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}</div>
                            </div>
                        )
                    })}
                    
                    {/* Time Column */}
                    <div className="row-span-1">
                        {HOURS.map(hour => (
                            <div key={hour} className="h-24 flex justify-end items-start pr-2 border-r">
                                <span className="text-sm text-gray-500 relative -top-2">{hour}:00</span>
                            </div>
                        ))}
                    </div>

                    {/* Schedule Grid */}
                    {DAYS.map((_, dayIndex) => (
                        <div key={dayIndex} className="relative border-r">
                            {HOURS.map(hour => (
                                <div key={hour} onClick={() => handleEmptySlotClick(dayIndex, hour)} className="h-24 border-b hover:bg-gray-50 cursor-pointer"></div>
                            ))}
                            {props.schedule.filter(c => c.dayOfWeek === dayIndex + 1).map(c => renderClassBlock(c, dayIndex))}
                        </div>
                    ))}
                </div>
            </div>
            
            {modalInfo?.type === 'attendance' && 
                <ClassAttendanceModal 
                    isOpen={true} 
                    onClose={() => setModalInfo(null)}
                    {...props}
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

const ClassAttendanceModal: React.FC<ScheduleManagerProps & { isOpen: boolean; onClose: () => void; classInfo: { classItem: ClassSchedule, date: Date } }> = ({ isOpen, onClose, students, memberships, attendance, toggleAttendance, classInfo }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const { classItem, date } = classInfo;
    
    const dateString = date.toISOString().split('T')[0];
    const classTimeString = `${classItem.startTime} - ${classItem.className}`;

    const activeStudents = useMemo(() => {
        return students.filter(student => {
            const membership = memberships.find(m => m.studentId === student.id);
            if (!membership) return false;
            
            if (membership.holdStartDate && membership.holdEndDate) {
                const holdStart = new Date(membership.holdStartDate);
                const holdEnd = new Date(membership.holdEndDate);
                if (date >= holdStart && date <= holdEnd) return false;
            }

            const startDate = new Date(membership.startDate);
            const endDate = new Date(membership.endDate);
            return date >= startDate && date <= endDate;
        }).filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
          .sort((a, b) => a.name.localeCompare(b.name));
    }, [students, memberships, date, searchTerm]);
    
    const isAttended = (studentId: string) => attendance.some(a => a.studentId === studentId && a.date === dateString && a.classTime === classTimeString);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg p-8 shadow-2xl w-full max-w-lg m-4 max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">{classItem.className} - 출석부</h2>
                        <p className="text-gray-600">{date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })} {classItem.startTime}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><CloseIcon className="w-6 h-6" /></button>
                </div>
                <input type="text" placeholder="이름으로 검색..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 mb-4"/>
                <ul className="divide-y divide-gray-200 overflow-y-auto flex-1">
                    {activeStudents.map(student => (
                        <li key={student.id} className="py-3 px-2 flex justify-between items-center hover:bg-gray-50 rounded">
                            <div>
                                <p className="font-medium text-gray-900">{student.name}</p>
                                <p className="text-sm text-gray-500">{student.phone}</p>
                            </div>
                             <input type="checkbox" checked={isAttended(student.id)} onChange={() => toggleAttendance(student.id, dateString, classTimeString)} className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"/>
                        </li>
                    ))}
                     {activeStudents.length === 0 && <li className="py-10 text-center text-gray-500">해당 날짜에 유효한 회원이 없습니다.</li>}
                </ul>
                 <div className="flex justify-end pt-4 mt-auto">
                    <button onClick={onClose} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">닫기</button>
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

    useEffect(() => {
        setFormData(classData);
    }, [classData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'dayOfWeek' ? Number(value) : value }));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg p-8 shadow-2xl w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">{isNew ? '새로운 수업 추가' : '수업 정보 수정'}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><CloseIcon className="w-6 h-6" /></button>
                </div>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">수업명</label>
                        <input type="text" name="className" value={formData.className} onChange={handleChange} className="mt-1 w-full border border-gray-300 rounded-md py-2 px-3" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">요일</label>
                            <select name="dayOfWeek" value={formData.dayOfWeek} onChange={handleChange} className="mt-1 w-full border border-gray-300 rounded-md py-2 px-3">
                                {DAYS.map((day, i) => <option key={i} value={i+1}>{day}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium">색상</label>
                            <select name="color" value={formData.color} onChange={handleChange} className="mt-1 w-full border border-gray-300 rounded-md py-2 px-3">
                                {Object.entries(CLASS_COLORS).map(([key, {name}]) => <option key={key} value={key}>{name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">시작 시간</label>
                            <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} className="mt-1 w-full border border-gray-300 rounded-md py-2 px-3" required />
                        </div>
                         <div>
                            <label className="block text-sm font-medium">종료 시간</label>
                            <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className="mt-1 w-full border border-gray-300 rounded-md py-2 px-3" required />
                        </div>
                    </div>
                    <div className="flex justify-between pt-4">
                        <div>
                            {!isNew && <button type="button" onClick={() => onDelete(formData.id)} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">삭제</button>}
                        </div>
                        <div className="flex justify-end">
                            <button type="button" onClick={onClose} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md mr-2 hover:bg-gray-300">취소</button>
                            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">저장</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};