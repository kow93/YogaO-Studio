
import React, { useState, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { Student, AttendanceRecord, Membership, ClassSchedule } from '../types';
import { CLASS_COLORS } from '../constants';
import { CloseIcon, DownloadIcon, UploadIcon, PlusIcon, SearchIcon } from './icons';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Seoul');

interface ScheduleManagerProps {
    students: Student[];
    memberships: Membership[];
    attendance: AttendanceRecord[];
    toggleAttendance: (studentId: string, date: string, classTime: string, classId?: string) => void;
    schedule: ClassSchedule[];
    addOrUpdateSchedule: (classData: ClassSchedule) => void;
    deleteSchedule: (classId: string) => void;
    importAttendance: (data: any[]) => void;
}

const DAYS = ['월', '화', '수', '목', '금', '토'];
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM to 10 PM

const getStartOfWeek = (date: dayjs.Dayjs) => {
    return date.startOf('week').add(1, 'day'); // Monday
};

function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let currentField = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                currentField += '"';
                i++;
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
    result.push(currentField.trim());
    return result;
}

export const ScheduleManager: React.FC<ScheduleManagerProps> = (props) => {
    const [currentDate, setCurrentDate] = useState(dayjs());
    const [modalInfo, setModalInfo] = useState<{ type: 'attendance' | 'edit'; data: any } | null>(null);

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
        props.addOrUpdateSchedule(classData);
        setModalInfo(null);
    };

    const handleDeleteClass = (classId: string) => {
        props.deleteSchedule(classId);
        setModalInfo(null);
    };

    const handleExport = () => {
        if (props.attendance.length === 0) return;
        const headerMapping = { student_id: '회원 ID', student_name: '이름', student_phone: '연락처', attendance_date: '출석 날짜', class_time: '수업 시간 정보' };
        const englishHeaders = Object.keys(headerMapping);
        const koreanHeaders = Object.values(headerMapping);
        const dataToExport = props.attendance.map(record => {
            const student = props.students.find(s => s.id === record.studentId);
            return { student_id: record.studentId, student_name: student ? student.name : '알 수 없음', student_phone: student ? student.phone : '', attendance_date: record.date, class_time: record.classTime };
        });
        const csvRows = dataToExport.map(row => englishHeaders.map(header => {
            let value = row[header as keyof typeof row];
            if (value === null || value === undefined) return '';
            let stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                stringValue = `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        }).join(','));
        const csvContent = "\uFEFF" + [koreanHeaders.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const today = dayjs().format('YYYY-MM-DD');
        link.setAttribute('download', `yogao_attendance_${today}.csv`);
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
            if (!text) return;
            try {
                const lines = text?.split(/\r\n|\n/)?.filter(line => line.trim() !== '');
                if (lines.length < 2) return;
                const koreanToEnglishMap: { [key: string]: string } = { '회원 ID': 'student_id', '이름': 'student_name', '연락처': 'student_phone', '출석 날짜': 'attendance_date', '수업 시간 정보': 'class_time' };
                const headerLine = parseCsvLine(lines[0]).map(h => h.trim().replace(/^\uFEFF/, ''));
                const headerIndexMap: { [key: string]: number } = {};
                headerLine.forEach((h, i) => {
                    const englishKey = koreanToEnglishMap[h];
                    if (englishKey) headerIndexMap[englishKey] = i;
                });
                const validData: any[] = [];
                lines.slice(1).forEach(line => {
                    const values = parseCsvLine(line);
                    const rowObj: { [key: string]: any } = {};
                    Object.keys(headerIndexMap).forEach(englishKey => {
                        const idx = headerIndexMap[englishKey];
                        if (values[idx] !== undefined) rowObj[englishKey] = values[idx];
                    });
                    if (rowObj.attendance_date && rowObj.class_time) validData.push(rowObj);
                });
                if (validData.length > 0) props.importAttendance(validData);
            } catch (error) {
                console.error("Error parsing CSV:", error);
            }
        };
        reader.readAsText(file, 'UTF-8');
        event.target.value = '';
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
        const classTimeString = `${classItem.startTime} - ${classItem.className}`;
        
        // User requested loose match on classTime string as primary matching logic
        const attendanceCount = props.attendance.filter(a => {
            const aDate = dayjs(a.date).format('YYYY-MM-DD');
            return aDate === dateString && a.classId === classItem.id;
        }).length;

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
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">시간표 & 출결</h2>
                    <p className="text-gray-500 mt-1">주간 수업 일정 관리 및 출석 현황 확인</p>
                </div>
                <div className="flex gap-3">
                    <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                        <button onClick={() => setCurrentDate(d => d.subtract(7, 'day'))} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400">&lt;</button>
                        <span className="px-4 text-sm font-bold text-gray-700">{startOfWeek.format('YYYY-MM-DD')} ~ {startOfWeek.add(5, 'day').format('YYYY-MM-DD')}</span>
                        <button onClick={() => setCurrentDate(d => d.add(7, 'day'))} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400">&gt;</button>
                    </div>
                    <input type="file" id="attendance-import" className="hidden" accept=".csv" onChange={handleImport} />
                    <label htmlFor="attendance-import" className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm cursor-pointer text-sm">
                        <UploadIcon className="w-4 h-4" /> 가져오기
                    </label>
                    <button onClick={handleExport} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm text-sm">
                        <DownloadIcon className="w-4 h-4" /> 내보내기
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="grid grid-cols-[80px_repeat(6,1fr)] min-w-[900px]">
                    <div className="bg-gray-50/50 border-r border-b border-gray-100"></div>
                    {DAYS.map((day, i) => {
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

                    {DAYS.map((_, dayIndex) => (
                        <div key={dayIndex} className="relative border-r border-gray-100">
                            {HOURS.map(hour => (
                                <div key={hour} onClick={() => handleEmptySlotClick(dayIndex, hour)} className="h-28 border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer group flex items-center justify-center">
                                    <PlusIcon className="w-4 h-4 text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
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
    const dateString = dayjs(date).format('YYYY-MM-DD');
    const classTimeString = `${classItem.startTime} - ${classItem.className}`;

    const displayStudents = useMemo(() => {
        const targetDate = dayjs(date).startOf('day');
        
        // 1. Get active students
        const active = students.filter(student => {
            const studentMemberships = memberships.filter(m => m.studentId === student.id);
            return studentMemberships.some(membership => {
                const startDate = dayjs(membership.startDate).startOf('day');
                const endDate = dayjs(membership.endDate).startOf('day');
                
                if (membership.holdStartDate && membership.holdEndDate) {
                    const holdStart = dayjs(membership.holdStartDate).startOf('day');
                    const holdEnd = dayjs(membership.holdEndDate).startOf('day');
                    if ((targetDate.isAfter(holdStart) || targetDate.isSame(holdStart)) && (targetDate.isBefore(holdEnd) || targetDate.isSame(holdEnd))) return false;
                }
                return (targetDate.isAfter(startDate) || targetDate.isSame(startDate)) && (targetDate.isBefore(endDate) || targetDate.isSame(endDate)) && !membership.refundAmount;
            });
        });

        // 2. Get attended students for this specific class using strict 1:1 comparison
        const attended = attendance
            .filter(a => {
                const aDate = dayjs(a.date).format('YYYY-MM-DD');
                return aDate === dateString && a.classId === classItem.id;
            })
            .map(a => {
                const s = students.find(s => s.id === a.studentId);
                // Prioritize student record, but fallback to attendance record info
                return s || { 
                    id: a.studentId || `temp-${a.id}`, 
                    name: a.studentName || 'Unknown', 
                    phone: a.studentPhone || '', 
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
            
    }, [students, memberships, date, searchTerm, attendance, dateString, classTimeString, classItem.id]);
    
    const isAttended = (studentId: string) => attendance.some(a => {
        const aDate = dayjs(a.date).format('YYYY-MM-DD');
        return a.studentId === studentId && aDate === dateString && a.classId === classItem.id;
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{classItem.className}</h2>
                        <p className="text-sm text-gray-500 font-medium mt-1">
                            {dayjs(date).format('MM월 DD일 dddd')} • {classItem.startTime}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2"><CloseIcon className="w-6 h-6" /></button>
                </div>
                <div className="relative mb-6">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="회원 이름 검색..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"/>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                    {displayStudents.map(student => (
                        <div key={student.id} className="p-4 flex justify-between items-center bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors">
                            <div>
                                <p className="font-bold text-gray-900">{student.name}</p>
                                <p className="text-[10px] text-gray-400 font-medium">{student.phone}</p>
                            </div>
                             <input type="checkbox" checked={isAttended(student.id)} onChange={() => toggleAttendance(student.id, dateString, classTimeString, classItem.id)} className="h-6 w-6 rounded-lg border-gray-200 text-indigo-600 focus:ring-indigo-500 cursor-pointer"/>
                        </div>
                    ))}
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
                                {DAYS.map((day, i) => <option key={i} value={i+1}>{day}</option>)}
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
