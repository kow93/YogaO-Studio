
import React, { useMemo, useState, useEffect } from 'react';
import { AttendanceRecord, ClassSchedule } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';

interface AttendanceAnalyticsProps {
    attendance: AttendanceRecord[];
    schedule: ClassSchedule[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const AttendanceAnalytics: React.FC<AttendanceAnalyticsProps> = ({ attendance, schedule }) => {
    const [aiAnalysis, setAiAnalysis] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const monthlyAvgData = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        const processMonth = (year: number, month: number) => {
            const monthAttendance = attendance.filter(a => {
                const aDate = new Date(a.date);
                return aDate.getFullYear() === year && aDate.getMonth() === month;
            });
            const daysWithAttendance = new Set(monthAttendance.map(a => a.date)).size;
            const totalAttendance = monthAttendance.length;
            return {
                totalAttendance,
                avgDaily: daysWithAttendance > 0 ? (totalAttendance / daysWithAttendance) : 0,
            };
        };

        const currentMonthData = processMonth(currentYear, currentMonth);
        const prevMonthData = processMonth(prevMonthYear, prevMonth);

        return [
            { name: `${prevMonth + 1}월`, '일평균 출석': Number(prevMonthData.avgDaily.toFixed(1)) },
            { name: `${currentMonth + 1}월`, '일평균 출석': Number(currentMonthData.avgDaily.toFixed(1)) },
        ];
    }, [attendance]);

    const timeSlotData = useMemo(() => {
        const counts: { [key: string]: number } = {};
        attendance.forEach(a => {
            const time = a.classTime?.split(' - ')[0];
            if (time) counts[time] = (counts[time] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name: `${name}`, value })).sort((a,b) => b.value - a.value);
    }, [attendance]);

    const programData = useMemo(() => {
        const counts: { [key: string]: number } = {};
        attendance.forEach(a => {
            const program = a.classTime?.split(' - ')[1];
            if(program) counts[program] = (counts[program] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    }, [attendance]);

    useEffect(() => {
        const fetchAiAnalysis = async () => {
            if (!process.env.GEMINI_API_KEY) {
                setError("API 키가 설정되지 않았습니다.");
                setIsLoading(false);
                return;
            }
            if (attendance.length === 0) {
                setAiAnalysis("출석 데이터가 부족하여 분석을 생성할 수 없습니다. 데이터가 쌓이면 AI 분석이 제공됩니다.");
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            setError(null);
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                const prompt = `
                    당신은 요가 스튜디오의 비즈니스 컨설턴트입니다. 아래 데이터를 분석하고, 운영자를 위한 실행 가능한 조언을 한국어로 제공해주세요.
                    **데이터 요약:**
                    - 월별 일평균 출석: 저번 달 ${monthlyAvgData[0]['일평균 출석']}명, 이번 달 ${monthlyAvgData[1]['일평균 출석']}명
                    - 시간대별 총 출석 횟수: ${timeSlotData.map(d => `${d.name}: ${d.value}회`).join(', ')}
                    - 프로그램별 총 출석 횟수: ${programData.map(d => `${d.name}: ${d.value}회`).join(', ')}
                    **분석 및 조언 가이드:**
                    1. 월별 출석 비교: 전월 대비 이번 달 출석률의 변화 분석.
                    2. 인기 시간대 및 프로그램 분석.
                    3. 실행 가능한 조언: 구체적인 액션 아이템 제안.
                    전체 내용을 마크다운 형식으로 작성해주세요.
                `;
                const response = await ai.models.generateContent({
                    model: 'gemini-2.0-flash-exp',
                    contents: prompt,
                });
                setAiAnalysis(response.text || '');
            } catch (e) {
                console.error(e);
                setError("AI 분석을 가져오는 중 오류가 발생했습니다.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchAiAnalysis();
    }, [monthlyAvgData, timeSlotData, programData]);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
                        월별 일평균 출석
                    </h3>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyAvgData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 500 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 500 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="일평균 출석" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                        시간대별 선호도
                    </h3>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={timeSlotData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value">
                                    {timeSlotData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-amber-500 rounded-full"></span>
                        프로그램 선호도
                    </h3>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={programData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value">
                                    {programData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">AI 비즈니스 인사이트</h3>
                </div>
                {isLoading ? (
                    <div className="flex items-center justify-center py-12 text-gray-400 gap-3">
                        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>데이터 분석 중...</span>
                    </div>
                ) : error ? (
                    <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">{error}</div>
                ) : (
                    <div className="prose prose-indigo max-w-none">
                        <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                    </div>
                )}
            </div>
        </div>
    );
};
