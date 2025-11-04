import React, { useState, useMemo } from 'react';
import { Expense, ExpenseCategory } from '../types';
import { EXPENSE_CATEGORIES_OPTIONS } from '../constants';

interface ExpenseManagerProps {
    expenses: Expense[];
    addExpense: (expense: Omit<Expense, 'id'>) => void;
    deleteExpense: (expenseId: string) => void;
}

export const ExpenseManager: React.FC<ExpenseManagerProps> = ({ expenses, addExpense, deleteExpense }) => {
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

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">가계부 (지출 관리)</h1>

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
