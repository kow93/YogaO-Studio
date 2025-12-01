
import React, { useState, useMemo } from 'react';
import { Expense, ExpenseCategory } from '../types';
import { EXPENSE_CATEGORIES_OPTIONS } from '../constants';
import { DownloadIcon, UploadIcon } from './icons';

interface ExpenseManagerProps {
    expenses: Expense[];
    addExpense: (expense: Omit<Expense, 'id'>) => void;
    deleteExpense: (expenseId: string) => void;
    importExpenses: (data: any[]) => void;
}

// Helper to parse CSV (Duplicated to avoid external dependency issues in this context)
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
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.SUPPLIES);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (date && category && description && amount) {
            addExpense({
                date,
                category,
                description,
                amount: Number(amount)
            });
            // Reset form
            setDate(new Date().toISOString().split('T')[0]);
            setCategory(ExpenseCategory.SUPPLIES);
            setDescription('');
            setAmount('');
        }
    };
    
    const sortedExpenses = useMemo(() => {
        return [...expenses].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [expenses]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ko-KR').format(value) + '원';
    };

    const handleExport = () => {
        if (expenses.length === 0) {
            alert('내보낼 지출 내역이 없습니다.');
            return;
        }

        const headerMapping = {
            date: '날짜',
            category: '분류',
            description: '내용',
            amount: '금액'
        };
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
        const today = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `yogao_expenses_${today}.csv`);
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
                    '날짜': 'date',
                    '분류': 'category',
                    '내용': 'description',
                    '금액': 'amount'
                };

                const headerLine = parseCsvLine(lines[0]).map(h => h.trim().replace(/^\uFEFF/, ''));
                const headerIndexMap: { [key: string]: number } = {};
                
                headerLine.forEach((h, i) => {
                    const englishKey = koreanToEnglishMap[h];
                    if (englishKey) headerIndexMap[englishKey] = i;
                });

                const validData: any[] = [];
                const expenseCategories = EXPENSE_CATEGORIES_OPTIONS.map(o => o.value);

                lines.slice(1).forEach(line => {
                    const values = parseCsvLine(line);
                    const rowObj: { [key: string]: any } = {};
                    
                    Object.keys(headerIndexMap).forEach(englishKey => {
                        const idx = headerIndexMap[englishKey];
                        if (values[idx] !== undefined) {
                            rowObj[englishKey] = values[idx];
                        }
                    });

                    // Validation
                    if (rowObj.date && rowObj.category && rowObj.description && rowObj.amount) {
                         // Check valid category
                         if (!expenseCategories.includes(rowObj.category)) {
                             // Optional: map to OTHER if invalid, or skip? Let's skip or alert in real app. 
                             // For now, accept and let user correct later or filter out.
                             // Actually better to be strict or default to OTHER.
                             if (!Object.values(ExpenseCategory).includes(rowObj.category)) {
                                 rowObj.category = ExpenseCategory.OTHER;
                             }
                         }
                        validData.push(rowObj);
                    }
                });

                if (validData.length > 0) {
                    importExpenses(validData);
                } else {
                    alert('가져올 유효한 지출 데이터가 없습니다. CSV 형식을 확인해주세요.');
                }

            } catch (error) {
                console.error("Error parsing CSV:", error);
                alert("CSV 파일을 처리하는 중 오류가 발생했습니다.");
            }
        };
        reader.readAsText(file, 'UTF-8');
        event.target.value = '';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-800">가계부 (지출 관리)</h1>
                <div className="flex items-center gap-2">
                    <input type="file" id="expense-import" className="hidden" accept=".csv" onChange={handleImport} />
                    <label htmlFor="expense-import" className="bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700 whitespace-nowrap cursor-pointer inline-flex items-center gap-2 text-sm">
                        <UploadIcon className="w-4 h-4" /> 가져오기
                    </label>
                    <button onClick={handleExport} className="bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700 whitespace-nowrap inline-flex items-center gap-2 text-sm">
                       <DownloadIcon className="w-4 h-4" /> 내보내기
                    </button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">지출 항목 추가</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    <div className="lg:col-span-1">
                        <label htmlFor="exp-date" className="block text-sm font-medium text-gray-700">날짜</label>
                        <input type="date" id="exp-date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
                    </div>
                    <div className="lg:col-span-1">
                        <label htmlFor="exp-category" className="block text-sm font-medium text-gray-700">품목</label>
                        <select id="exp-category" value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                            {EXPENSE_CATEGORIES_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                    <div className="lg:col-span-1">
                        <label htmlFor="exp-desc" className="block text-sm font-medium text-gray-700">내용</label>
                        <input type="text" id="exp-desc" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
                    </div>
                    <div className="lg:col-span-1">
                        <label htmlFor="exp-amount" className="block text-sm font-medium text-gray-700">금액</label>
                        <input type="number" id="exp-amount" value={amount} onChange={e => setAmount(e.target.value)} placeholder="숫자만 입력" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
                    </div>
                    <div className="lg:col-span-1">
                         <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 w-full">추가하기</button>
                    </div>
                </form>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                 <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                        <tr>
                            <th scope="col" className="px-6 py-3">날짜</th>
                            <th scope="col" className="px-6 py-3">품목</th>
                            <th scope="col" className="px-6 py-3">내용</th>
                            <th scope="col" className="px-6 py-3 text-right">금액</th>
                            <th scope="col" className="px-6 py-3 text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedExpenses.length > 0 ? sortedExpenses.map(exp => (
                            <tr key={exp.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">{new Date(exp.date).toLocaleDateString('ko-KR')}</td>
                                <td className="px-6 py-4">
                                     <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-800">
                                        {exp.category}
                                    </span>
                                </td>
                                <td className="px-6 py-4">{exp.description}</td>
                                <td className="px-6 py-4 text-right font-medium text-gray-800">{formatCurrency(exp.amount)}</td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => window.confirm(`이 지출 항목을 삭제하시겠습니까?`) && deleteExpense(exp.id)} className="font-medium text-red-600 hover:underline">삭제</button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-gray-500">등록된 지출 내역이 없습니다.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
