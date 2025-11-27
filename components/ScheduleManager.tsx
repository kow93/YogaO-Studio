
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, Membership, ClassSchedule } from '../types';
import { CLASS_COLORS } from '../constants';
import { CloseIcon, DownloadIcon, UploadIcon } from './icons';

interface ScheduleManagerProps {
    students: Student[];
    memberships: Membership[];
    attendance: AttendanceRecord[];
    toggleAttendance: (studentId: string, date: string, classTime: string) => void;
    schedule: ClassSchedule[];
    addOrUpdateSchedule: (classData: ClassSchedule) => void;
    deleteSchedule: (classId: string) => void;
    importAttendance: (data: any[]) => void;
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

// CSV Parser (Duplicated from StudentManager to avoid file dependency issues in single file edit context, or could be moved to utils)
function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let currentField = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Escaped quote
                currentField += '"';
                i++; // Skip next quote
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
    result.push(currentField.trim()); // Add the last field
    return result;
}


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

    const handleExport = () => {
        if (props.attendance.length === 0) {
            alert('내보낼 출석 데이터가 없습니다.');
            return;
        }

        const headerMapping = {
            student_id: '회원 ID',
            student_name: '이름',
            student_phone: '연락처',
            attendance_date: '출석 날짜',
            class_time: '수업 시간 정보'
        };
        const englishHeaders = Object.keys(headerMapping);
        const koreanHeaders = Object.values(headerMapping);

        const dataToExport = props.attendance.map(record => {
            const student = props.students.find(s => s.id === record.studentId);
            return {
                student_id: record.studentId,
                student_name: student ? student.name : '알 수 없음',
                student_phone: student ? student.phone : '',
                attendance_date: record.date,
                class_time: record.classTime
            };
        });

        const csvRows = dataToExport.map(row => 
            englishHeaders.map(header => {
                let value = row[header as keyof typeof row];
                if (value === null || value === undefined) return '';
                let stringValue = String(value);
                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                    stringValue = `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            }).join(',')
        );

        const csvContent = "\uFEFF" + [koreanHeaders.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const today = new Date().toISOString().split('T')[0];
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
            if (!text) {
                alert('파일을 읽을 수 없습니다.');
                return;
            }

            try {
                const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
                if (lines.length < 2) {
                    alert('파일에 헤더 외 데이터가 없습니다.');
                    return;
                }
                
                const koreanToEnglishMap: { [key: string]: string } = {
                    '회원 ID': 'student_id',
                    '이름': 'student_name',
                    '연락처': 'student_phone',
                    '출석 날짜': 'attendance_date',
                    '수업 시간 정보': 'class_time'
                };

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
                        if (values[idx] !== undefined) {
                            rowObj[englishKey] = values[idx];
                        }
                    });

                    if (rowObj.attendance_date && rowObj.class_time) {
                        validData.push(rowObj);
                    }
                });

                if (validData.length > 0) {
                    props.importAttendance(validData);
                } else {
                    alert('가져올 유효한 출석 데이터가 없습니다.');
                }

            } catch (error) {
                console.error("Error parsing CSV:", error);
                alert("CSV 파일을 처리하는 중 오류가 발생했습니다.");
            }
        };
        reader.readAsText(file, 'UTF-8');
        event.target.value = '';
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
                
                <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-start md:justify-end">
                     <div className="flex items-center gap-4 mr-4">
                        <button onClick={() => setCurrentDate(d => new Date(d.setDate(d.getDate() - 7)))} className="px-3 py-1 rounded bg-white border shadow-sm">&lt; 이전 주</button>
                        <span className="font-semibold">{startOfWeek.toLocaleDateString('ko-KR')} ~ {new Date(new Date(startOfWeek).setDate(startOfWeek.getDate() + 5)).toLocaleDateString('ko-KR')}</span>
                        <button onClick={() => setCurrentDate(d => new Date(d.setDate(d.getDate() + 7)))} className="px-3 py-1 rounded bg-white border shadow-sm">다음 주 &gt;</button>
                    </div>
                    
                    <div className="h-6 w-px bg-gray-300 mx-2 hidden md:block"></div>

                    <input type="file" id="attendance-import" className="hidden" accept=".csv" onChange={handleImport} />
                    <label htmlFor="attendance-import" className="bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700 whitespace-nowrap cursor-pointer inline-flex items-center gap-2 text-sm">
                        <UploadIcon className="w-4 h-4" /> 출석부 가져오기
                    </label>
                    <button onClick={handleExport} className="bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700 whitespace-nowrap inline-flex items-center gap-2 text-sm">
                       <DownloadIcon className="w-4 h-4" /> 출석부 내보내기
                    </button>
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
        // Normalize the class date to midnight (00:00:00) to ignore time parts
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        return students.filter(student => {
            // Find ALL memberships for this student, not just the first one
            const studentMemberships = memberships.filter(m => m.studentId === student.id);
            if (studentMemberships.length === 0) return false;
            
            // Check if ANY of the student's memberships are active for the target date
            return studentMemberships.some(membership => {
                // Normalize membership start/end dates to midnight
                const startDate = new Date(membership.startDate);
                startDate.setHours(0, 0, 0, 0);
                
                const endDate = new Date(membership.endDate);
                endDate.setHours(0, 0, 0, 0);

                if (membership.holdStartDate && membership.holdEndDate) {
                    const holdStart = new Date(membership.holdStartDate);
                    holdStart.setHours(0, 0, 0, 0);
                    const holdEnd = new Date(membership.holdEndDate);
                    holdEnd.setHours(0, 0, 0, 0);
                    // If currently in holding period, consider inactive
                    if (targetDate >= holdStart && targetDate <= holdEnd) return false;
                }

                // Check date range
                return targetDate >= startDate && targetDate <= endDate;
            });
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
