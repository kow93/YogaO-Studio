
import React, { useState, useMemo, useCallback } from 'react';
import dayjs from 'dayjs';
import { Expense, ExpenseCategory } from '../types';
import { EXPENSE_CATEGORIES_OPTIONS } from '../constants';
import { DownloadIcon, UploadIcon, PlusIcon, SearchIcon } from './icons';

interface ExpenseManagerProps {
    expenses: Expense[];
    addExpense: (expense: Omit<Expense, 'id'>) => void;
    deleteExpense: (expenseId: string) => void;
    importExpenses: (data: any[]) => void;
}

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

export const ExpenseManager: React.FC<ExpenseManagerProps> = ({ expenses, addExpense, deleteExpense, importExpenses }) => {
    const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.SUPPLIES);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const [currentMonth, setCurrentMonth] = useState(dayjs());

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (date && category && description && amount) {
            addExpense({
                date,
                category,
                description,
                amount: Number(amount)
            });
            setDate(dayjs().format('YYYY-MM-DD'));
            setCategory(ExpenseCategory.SUPPLIES);
            setDescription('');
            setAmount('');
        }
    }, [date, category, description, amount, addExpense]);
    
    const filteredExpenses = useMemo(() => {
        const search = (searchTerm || '').toLowerCase();
        return expenses
            .filter(e => dayjs(e.date).isSame(currentMonth, 'month'))
            .filter(e => (e.description || '').toLowerCase().includes(search) || (e.category || '').toLowerCase().includes(search))
            .sort((a,b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
    }, [expenses, searchTerm, currentMonth]);

    const formatCurrency = useCallback((value: number | string) => {
        const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, "")) : value;
        if (isNaN(numValue)) return '0원';
        return numValue.toLocaleString() + '원';
    }, []);

    const handleExport = useCallback(() => {
        if (expenses.length === 0) {
            alert('내보낼 지출 내역이 없습니다.');
            return;
        }
        const headerMapping = { date: '날짜', category: '분류', description: '내용', amount: '금액' };
        const englishHeaders = Object.keys(headerMapping);
        const koreanHeaders = Object.values(headerMapping);
        const csvRows = expenses.map(exp => 
            englishHeaders.map(header => {
                let value = exp[header as keyof Expense];
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
        const today = dayjs().format('YYYY-MM-DD');
        link.setAttribute('download', `yogao_expenses_${today}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [expenses]);

    const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) return;
            try {
                const lines = text?.split(/\r\n|\n/)?.filter(line => line.trim() !== '');
                if (lines.length < 2) return;
                const koreanToEnglishMap: { [key: string]: string } = { '날짜': 'date', '분류': 'category', '내용': 'description', '금액': 'amount' };
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
                    if (rowObj.date && rowObj.category && rowObj.description && rowObj.amount) {
                         if (!Object.values(ExpenseCategory).includes(rowObj.category)) {
                             rowObj.category = ExpenseCategory.OTHER;
                         }
                        validData.push(rowObj);
                    }
                });
                if (validData.length > 0) importExpenses(validData);
            } catch (error) {
                console.error("Error parsing CSV:", error);
            }
        };
        reader.readAsText(file, 'UTF-8');
        event.target.value = '';
    }, [importExpenses]);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">지출 관리</h2>
                    <p className="text-gray-500 mt-1">스튜디오 운영을 위한 모든 지출 내역 관리</p>
                </div>
                <div className="flex gap-3 items-center">
                    <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm mr-2">
                        <button onClick={() => setCurrentMonth(d => d.subtract(1, 'month'))} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400">&lt;</button>
                        <span className="px-4 text-sm font-bold text-gray-700">{currentMonth.format('YYYY년 MM월')}</span>
                        <button onClick={() => setCurrentMonth(d => d.add(1, 'month'))} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400">&gt;</button>
                    </div>
                    <input type="file" id="expense-import" className="hidden" accept=".csv" onChange={handleImport} />
                    <label htmlFor="expense-import" className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm cursor-pointer text-sm">
                        <UploadIcon className="w-4 h-4" /> 가져오기
                    </label>
                    <button onClick={handleExport} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm text-sm">
                        <DownloadIcon className="w-4 h-4" /> 내보내기
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Add Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 sticky top-8">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <PlusIcon className="w-5 h-5 text-indigo-600" />
                            지출 항목 추가
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">날짜</label>
                                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">품목</label>
                                <select value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                                    {EXPENSE_CATEGORIES_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">내용</label>
                                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="예: 요가 매트 구매" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">금액</label>
                                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" required />
                            </div>
                            <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 mt-4">
                                지출 등록
                            </button>
                        </form>
                    </div>
                </div>

                {/* List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="relative">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="지출 내역 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">날짜</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">분류</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">내용</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">금액</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredExpenses.map(exp => (
                                        <tr key={exp.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {dayjs(exp.date).format('YYYY-MM-DD')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 text-[10px] font-bold rounded-md bg-gray-100 text-gray-600 border border-gray-200">
                                                    {exp.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{exp.description}</td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(exp.amount)}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => window.confirm(`이 지출 항목을 삭제하시겠습니까?`) && deleteExpense(exp.id)} 
                                                    className="text-gray-300 hover:text-rose-600 transition-colors"
                                                >
                                                    삭제
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredExpenses.length === 0 && (
                            <div className="p-12 text-center text-gray-400">
                                등록된 지출 내역이 없습니다.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
