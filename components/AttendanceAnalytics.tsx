import React, { useMemo, useState, useEffect } from 'react';
import { AttendanceRecord, ClassSchedule } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import { GoogleGenAI } from '@google/genai';

interface AttendanceAnalyticsProps {
    attendance: AttendanceRecord[];
    schedule: ClassSchedule[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', '#00c49f'];

const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill}>
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`${value}회`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
        {`(${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};


export const AttendanceAnalytics: React.FC<AttendanceAnalyticsProps> = ({ attendance, schedule }) => {
    const [aiAnalysis, setAiAnalysis] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);


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
            { name: `${prevMonth + 1}월`, '일평균 출석': prevMonthData.avgDaily.toFixed(1) },
            { name: `${currentMonth + 1}월`, '일평균 출석': currentMonthData.avgDaily.toFixed(1) },
        ];
    }, [attendance]);

    const timeSlotData = useMemo(() => {
        const counts: { [key: string]: number } = {};
        attendance.forEach(a => {
            const time = a.classTime.split(' - ')[0];
            counts[time] = (counts[time] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name: `${name} 수업`, value })).sort((a,b) => b.value - a.value);
    }, [attendance]);

    const programData = useMemo(() => {
        const counts: { [key: string]: number } = {};
        attendance.forEach(a => {
            const program = a.classTime.split(' - ')[1];
            if(program) {
               counts[program] = (counts[program] || 0) + 1;
            }
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    }, [attendance]);

    useEffect(() => {
        const fetchAiAnalysis = async () => {
            if (!process.env.API_KEY) {
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
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                
                const prompt = `
                    당신은 요가 스튜디오의 비즈니스 컨설턴트입니다. 아래 데이터를 분석하고, 운영자를 위한 실행 가능한 조언을 한국어로 제공해주세요.

                    **데이터 요약:**
                    - 월별 일평균 출석: 
                      - 저번 달: ${monthlyAvgData[0]['일평균 출석']}명
                      - 이번 달: ${monthlyAvgData[1]['일평균 출석']}명
                    - 시간대별 총 출석 횟수: ${timeSlotData.map(d => `${d.name}: ${d.value}회`).join(', ')}
                    - 프로그램별 총 출석 횟수: ${programData.map(d => `${d.name}: ${d.value}회`).join(', ')}

                    **분석 및 조언 가이드:**
                    1.  **월별 출석 비교:** 전월 대비 이번 달 출석률의 변화를 짚어주고, 긍정적/부정적 추세에 대한 의견을 제시하세요.
                    2.  **인기 시간대 및 프로그램 분석:** 어떤 시간대와 프로그램이 가장 인기가 많은지, 반대로 인기가 저조한지는 무엇인지 분석하세요.
                    3.  **실행 가능한 조언:** 분석을 바탕으로 2-3가지 구체적인 액션 아이템을 제안하세요. (예: 비인기 시간대 활성화를 위한 프로모션, 인기 프로그램 추가 개설, 신규 프로그램 아이디어 등)
                    4.  **형식:** 전체 내용을 마크다운 형식으로, 친근하지만 전문적인 어조로 작성해주세요.
                `;

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                });

                setAiAnalysis(response.text);
            } catch (e) {
                console.error(e);
                setError("AI 분석을 가져오는 중 오류가 발생했습니다.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAiAnalysis();
    }, [monthlyAvgData, timeSlotData, programData]);

    const onPieEnter = (_: any, index: number) => {
      setActiveIndex(index);
    };

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-800">출석 통계 분석</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">월별 일평균 출석</h3>
                     <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={monthlyAvgData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="일평균 출석" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                 <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">시간대별 출석률</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                             <Pie 
                                data={timeSlotData} 
                                cx="50%" 
                                cy="50%" 
                                labelLine={false}
                                outerRadius={80} 
                                fill="#82ca9d"
                                dataKey="value"
                                nameKey="name"
                                activeIndex={activeIndex}
                                activeShape={renderActiveShape}
                                onMouseEnter={onPieEnter}
                            >
                                {timeSlotData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                             </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                 <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">프로그램별 출석률</h3>
                     <ResponsiveContainer width="100%" height={200}>
                       <PieChart>
                           <Pie 
                                data={programData} 
                                cx="50%" 
                                cy="50%" 
                                labelLine={false}
                                outerRadius={80} 
                                fill="#ffc658"
                                dataKey="value"
                                nameKey="name"
                                activeIndex={activeIndex}
                                activeShape={renderActiveShape}
                                onMouseEnter={onPieEnter}
                            >
                                {programData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                             </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">💡 AI 분석 및 조언</h3>
                {isLoading ? (
                    <div className="flex items-center justify-center h-24 text-gray-500">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        AI가 데이터를 분석하는 중입니다...
                    </div>
                ) : error ? (
                    <div className="text-red-500">{error}</div>
                ) : (
                    <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap">{aiAnalysis}</div>
                )}
            </div>
        </div>
    );
};
