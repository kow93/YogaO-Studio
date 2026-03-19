import React, { useState, useEffect } from 'react';
import { ClassSchedule } from '../types';
import { CLASS_COLORS } from '../constants';
import { CloseIcon } from './icons';

const WEEK_DAYS = ['월', '화', '수', '목', '금', '토'];

interface AddEditClassModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (classData: ClassSchedule) => void;
    onDelete: (classId: string) => void;
    classData: ClassSchedule;
    isNew: boolean;
}

export const AddEditClassModal: React.FC<AddEditClassModalProps> = ({ isOpen, onClose, onSave, onDelete, classData, isNew }) => {
    const [formData, setFormData] = useState<ClassSchedule>(classData);
    
    useEffect(() => { 
        setFormData(classData); 
    }, [classData]);

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
