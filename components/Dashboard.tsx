
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isBetween from 'dayjs/plugin/isBetween';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Student, Membership, Expense, AttendanceRecord, ClassSchedule, AttendanceFormatted, Transaction } from '../types';
import { ChevronLeft, ChevronRight, Target, TrendingUp, Users, Wallet, BarChart2, Calendar } from 'lucide-react';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);

interface DashboardProps {
    students: Student[];
    memberships: Membership[];
    expenses: Expense[];
    attendance: AttendanceRecord[];
    attendanceFormatted: AttendanceFormatted[];
    schedule: ClassSchedule[];
    transactions: Transaction[];
    refreshData?: () => Promise<void>;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const Dashboard: React.FC<DashboardProps> = ({ students, memberships, expenses, attendance, attendanceFormatted, schedule, transactions, refreshData }) => {
    const today = useMemo(() => dayjs().tz('Asia/Seoul'), []);
    const [statsDate, setStatsDate] = useState(today.startOf('month'));
    const [objective, setObjective] = useState('');
    const [renewalPage, setRenewalPage] = useState(0);
    const [showTrend, setShowTrend] = useState(false);
    const itemsPerPage = 6;

    // Load objective from localStorage
    useEffect(() => {
        const key = `objective_${statsDate.format('YYYY_MM')}`;
        const saved = localStorage.getItem(key);
        setObjective(saved || '');
    }, [statsDate]);

    // Save objective to localStorage
    const handleObjectiveChange = (val: string) => {
        setObjective(val);
        const key = `objective_${statsDate.format('YYYY_MM')}`;
        localStorage.setItem(key, val);
    };

    useEffect(() => {
        if (refreshData) {
            refreshData();
        }
    }, [refreshData]);

    useEffect(() => {
        setRenewalPage(0);
    }, [statsDate]);

    // Helper: Count occurrences of each day of week in a month
    const getDaysInMonthCount = useCallback((date: dayjs.Dayjs) => {
        const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        const start = date.startOf('month');
        const end = date.endOf('month');
        let current = start;
        while (current.isBefore(end) || current.isSame(end)) {
            counts[current.day()]++;
            current = current.add(1, 'day');
        }
        return counts;
    }, []);

    // Active Members Count
    const activeMembersCount = useMemo(() => {
        const t = today.startOf('day').format('YYYY-MM-DD');
        const activeIds = new Set();
        memberships.forEach(m => {
            if (m.refundAmount || m.status === 'Refunded' || m.status === 'Upgraded') return;
            const end = dayjs(m.endDate).format('YYYY-MM-DD');
            if (end >= t) activeIds.add(m.studentId);
        });
        return activeIds.size;
    }, [memberships, today]);

    // Upcoming Renewals
    const upcomingRenewals = useMemo(() => {
        const monthStr = statsDate.format('YYYY-MM');
        return memberships
            .filter(m => {
                if (m.refundAmount || m.status === 'Refunded' || m.status === 'Upgraded') return false;
                const end = dayjs(m.endDate).tz('Asia/Seoul');
                if (end.format('YYYY-MM') !== monthStr) return false;

                const studentMemberships = memberships.filter(sm => sm.studentId === m.studentId && !sm.refundAmount && sm.status !== 'Refunded' && sm.status !== 'Upgraded');
                const latest = studentMemberships.sort((a, b) => dayjs(b.endDate).diff(dayjs(a.endDate)))[0];
                return latest?.id === m.id;
            })
            .map(m => ({ ...m, student: students.find(s => s.id === m.studentId) }))
            .sort((a, b) => dayjs(a.endDate).diff(dayjs(b.endDate)));
    }, [memberships, students, statsDate]);

    // Attendance Stats [A] & [B] & [C] using raw attendance data
    const attendanceStats = useMemo(() => {
        const monthStr = statsDate.format('YYYY-MM');
        
        console.log('원본 출석 데이터 수:', attendance.length);

        // Safety Guard: Normalize raw attendance data
        // 3. 데이터 안전 장치: 날짜 처리 시 dayjs(item.attendance_date).format('YYYY-MM-DD')를 사용해서 형식을 통일해줘.
        const normalizedAttendance = attendance.map(a => {
            const rawDate = (a as any).attendance_date || a.date;
            const formattedDate = dayjs(rawDate).format('YYYY-MM-DD');
            const info = (a as any).class_info || a.classTime || '';
            return { ...a, formattedDate, info };
        });

        const monthAttendance = normalizedAttendance.filter(a => a.formattedDate.startsWith(monthStr));
        
        console.log('필터링된 이번 달 데이터:', monthAttendance.length);

        const dayCounts = getDaysInMonthCount(statsDate);

        // [A] 프로그램별 평균 (Bar Chart)
        const isAfterMay2026 = statsDate.isAfter(dayjs('2026-04-30')) || statsDate.isSame(dayjs('2026-05-01'), 'month');
        
        let programs = ['강인한', '활기찬', '고요한'];
        if (isAfterMay2026) {
            programs = ['강인한', '활기찬', '고요한', '깊어지는 요가(오전)', '깊어지는 요가(오후)', '임산부 요가'];
        }

        const programData = programs.map(p => {
            const programAttendance = monthAttendance.filter(a => {
                const d = dayjs(a.formattedDate).day();
                const isWeekend = d === 0 || d === 6;
                return a.info.includes(p) && !isWeekend;
            });
            const totalAttendance = programAttendance.length;
            
            // 평균 계산: (해당 그룹 총 인원) / (해당 그룹 데이터가 존재하는 유니크한 날짜 수)
            const uniqueDates = new Set(programAttendance.map(a => a.formattedDate)).size;
            
            // 분모(수업 일수)가 0인 경우 avg는 무조건 0이 되게 || 0 처리를 해줘.
            const avg = uniqueDates > 0 ? Number((totalAttendance / uniqueDates).toFixed(1)) : 0;
            return { name: p, avg: avg || 0 };
        });
        // 4. 확인용 로그: 계산 중간에 console.log('분류된 프로그램 데이터:', programData)를 추가
        console.log('분류된 프로그램 데이터:', programData);

        // [B] 시간대별 평균 (Line Chart)
        let slots = [
            { label: '오전 10:10', time: '10:10' },
            { label: '오후 18:10', time: '18:10' },
            { label: '오후 19:40', time: '19:40' }
        ];
        
        // 2026-05 이후 신규 시간대 추가
        if (isAfterMay2026) {
            slots = [
                { label: '오전 09:30', time: '09:30' },
                { label: '오전 10:10', time: '10:10' },
                { label: '오전 11:30', time: '11:30' },
                { label: '오후 17:30', time: '17:30' },
                { label: '오후 18:10', time: '18:10' },
                { label: '오후 19:40', time: '19:40' }
            ];
        }

        const timeSlotData = slots.map(s => {
            // item.class_info에 해당 시간 숫자('10:10' 등)가 포함만 되어 있으면 카운트해.
            const slotAttendance = monthAttendance.filter(a => {
                const d = dayjs(a.formattedDate).day();
                const isWeekend = d === 0 || d === 6;
                return a.info.includes(s.time) && !isWeekend;
            });
            const totalAttendance = slotAttendance.length;
            
            // 평균 계산: (해당 시간대 총 인원) / (해당 시간대 데이터가 존재하는 유니크한 날짜 수)
            const uniqueDates = new Set(slotAttendance.map(a => a.formattedDate)).size;
            
            const avg = uniqueDates > 0 ? Number((totalAttendance / uniqueDates).toFixed(1)) : 0;
            return { name: s.label, avg: avg || 0 };
        });
        console.log('시간대 통계:', timeSlotData);

        // [C] Daily Attendance Trend
        const daysInMonth = statsDate.daysInMonth();
        const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const d = statsDate.date(day);
            const dateStr = d.format('YYYY-MM-DD');
            const count = monthAttendance.filter(a => a.formattedDate === dateStr).length;
            const isWeekend = d.day() === 0 || d.day() === 6;
            return { name: `${day}일`, count, isWeekend };
        });

        // Calculate Weekday Average
        const weekdayAttendanceCount = monthAttendance.filter(a => {
            const d = dayjs(a.date).day();
            return d !== 0 && d !== 6;
        }).length;
        const totalWeekdays = dayCounts[1] + dayCounts[2] + dayCounts[3] + dayCounts[4] + dayCounts[5];
        const weekdayAvg = totalWeekdays > 0 ? (weekdayAttendanceCount / totalWeekdays).toFixed(1) : '0.0';

        return { programData, timeSlotData, dailyData, total: monthAttendance.length, weekdayAvg };
    }, [attendance, statsDate, schedule, getDaysInMonthCount]);

    // 6-Month Trend Data using raw attendance data (Weekday Average)
    const trendData = useMemo(() => {
        const data = [];
        const normalizedAttendance = attendance.map(a => ({
            ...a,
            formattedDate: dayjs(a.date).tz('Asia/Seoul').format('YYYY-MM-DD')
        }));

        for (let i = 5; i >= 0; i--) {
            const month = today.subtract(i, 'month');
            const monthStr = month.format('YYYY-MM');
            const monthAttendance = normalizedAttendance.filter(a => a.formattedDate.startsWith(monthStr));
            
            // Filter for weekdays only
            const weekdayAttendance = monthAttendance.filter(a => {
                const d = dayjs(a.date).day();
                return d !== 0 && d !== 6;
            });

            const dayCounts = getDaysInMonthCount(month);
            const totalWeekdays = dayCounts[1] + dayCounts[2] + dayCounts[3] + dayCounts[4] + dayCounts[5];
            
            const avgAttendance = totalWeekdays > 0 ? Number((weekdayAttendance.length / totalWeekdays).toFixed(1)) : 0;
            
            data.push({
                name: month.format('M월'),
                avgAttendance
            });
        }
        return data;
    }, [attendance, today, getDaysInMonthCount]);

    // [C] Membership Distribution
    const pieData = useMemo(() => {
        const counts: Record<string, number> = {};
        const t = today.startOf('day').format('YYYY-MM-DD');
        
        const activeMemberships = memberships.filter(m => {
            if (m.status !== 'Active' && m.status !== undefined) return false;
            const end = dayjs(m.endDate).format('YYYY-MM-DD');
            return end >= t;
        });

        activeMemberships.forEach(m => {
            const key = m.passType || '기타';
            counts[key] = (counts[key] || 0) + 1;
        });
        
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [memberships, today]);

    const totalPages = Math.ceil(upcomingRenewals.length / itemsPerPage);
    const currentRenewals = upcomingRenewals.slice(renewalPage * itemsPerPage, (renewalPage + 1) * itemsPerPage);

    const EmptyState = () => (
        <div className="flex flex-col items-center justify-center h-full py-12 text-gray-400 italic">
            <p>데이터가 없습니다</p>
        </div>
    );

    return (
        <div className="space-y-8 pb-12">
            {/* Header & Date Selector */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">운영 통계 대시보드</h2>
                    <p className="text-gray-500 mt-1 text-sm">스튜디오 출석 현황 및 회원 분포 분석</p>
                </div>
                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                    <button onClick={() => setStatsDate(prev => prev.subtract(1, 'month'))} className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-colors"><ChevronLeft size={20} /></button>
                    <span className="text-sm font-bold text-gray-900 min-w-[100px] text-center">{statsDate.format('YYYY년 MM월')}</span>
                    <button onClick={() => setStatsDate(prev => prev.add(1, 'month'))} className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-colors"><ChevronRight size={20} /></button>
                </div>
            </div>

            {/* 1. N월의 OBJECTIVE */}
            <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl flex flex-col md:flex-row items-center gap-6 shadow-sm">
                <div className="flex items-center gap-3 shrink-0">
                    <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                        <Target size={24} />
                    </div>
                    <h3 className="text-2xl font-black text-indigo-900 whitespace-nowrap">
                        {statsDate.format('M월')}의 OBJECTIVE:
                    </h3>
                </div>
                <input 
                    type="text"
                    value={objective}
                    onChange={(e) => handleObjectiveChange(e.target.value)}
                    placeholder="이번 달의 목표를 입력하세요 (예: 신규 회원 20명 유치!)"
                    className="flex-1 bg-white/60 backdrop-blur-sm border-2 border-transparent focus:border-indigo-400 focus:bg-white rounded-2xl px-6 py-4 text-xl font-bold text-indigo-800 placeholder:text-indigo-200 outline-none transition-all shadow-inner"
                />
            </div>

            {/* 2. [D] Daily Attendance Trend / 6-Month Trend Chart (Main Hero Chart) */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-indigo-600 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-indigo-400 rounded-full"></span>
                        {showTrend ? '최근 6개월 평일 평균 출석 추이' : '일별 출석 인원 추이 (당월)'}
                    </h3>
                    <div className="flex items-center gap-4">
                        {!showTrend && (
                            <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100 shadow-sm">
                                <TrendingUp size={16} className="text-indigo-500" />
                                <span className="text-sm font-bold text-indigo-700">
                                    당월 평일 평균: <span className="text-lg text-indigo-900">{attendanceStats.weekdayAvg}</span>명
                                </span>
                            </div>
                        )}
                        <button 
                            onClick={() => setShowTrend(!showTrend)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[12px] font-bold transition-all shadow-sm ${showTrend ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-gray-50 text-gray-500 border border-gray-100 hover:bg-gray-100'}`}
                        >
                            {showTrend ? <Calendar size={14} /> : <TrendingUp size={14} />}
                            {showTrend ? '일별 보기' : '6개월 추이 보기'}
                        </button>
                    </div>
                </div>
                <div className="h-[300px] w-full relative">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={showTrend ? 'trend' : 'daily'}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="h-full w-full"
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                {showTrend ? (
                                    <LineChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 500 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 500 }} />
                                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                        <Line type="monotone" dataKey="avgAttendance" name="평균 출석" stroke="#6366f1" strokeWidth={4} dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                ) : (
                                    <LineChart data={attendanceStats.dailyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <XAxis 
                                            dataKey="name" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={(props) => {
                                                const { x, y, payload } = props;
                                                const dataPoint = attendanceStats.dailyData.find(d => d.name === payload.value);
                                                const yPos = typeof y === 'number' ? y : parseFloat(y);
                                                return (
                                                    <text x={x} y={yPos + 15} textAnchor="middle" fontSize={10} fill={dataPoint?.isWeekend ? '#ef4444' : '#9ca3af'} fontWeight={500}>
                                                        {payload.value}
                                                    </text>
                                                );
                                            }}
                                        />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 500 }} />
                                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                        <Line type="monotone" dataKey="count" name="출석인원" stroke="#6366f1" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                    </LineChart>
                                )}
                            </ResponsiveContainer>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Upcoming Renewals Section */}
            {!showTrend && (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-indigo-600 flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-rose-500 rounded-full"></span>
                            당월 재등록 예정자 ({upcomingRenewals.length}명)
                        </h3>
                        {upcomingRenewals.length > itemsPerPage && (
                            <div className="flex items-center gap-4">
                                <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                                    {renewalPage + 1} / {Math.ceil(upcomingRenewals.length / itemsPerPage)}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setRenewalPage(p => Math.max(0, p - 1))}
                                        disabled={renewalPage === 0}
                                        className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all shadow-sm active:scale-95"
                                    >
                                        <ChevronLeft size={18} className="text-gray-600" />
                                    </button>
                                    <button
                                        onClick={() => setRenewalPage(p => Math.min(Math.ceil(upcomingRenewals.length / itemsPerPage) - 1, p + 1))}
                                        disabled={renewalPage >= Math.ceil(upcomingRenewals.length / itemsPerPage) - 1}
                                        className="p-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-30 disabled:hover:bg-indigo-50 transition-all shadow-sm active:scale-95"
                                    >
                                        <ChevronRight size={18} className="text-indigo-600" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="relative min-h-[160px]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={renewalPage}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                            >
                                {upcomingRenewals.slice(renewalPage * itemsPerPage, (renewalPage + 1) * itemsPerPage).map(m => (
                                    <div key={m.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-rose-200 transition-all group">
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm group-hover:text-rose-600 transition-colors">{m.student?.name || '알 수 없음'}</p>
                                            <p className="text-[10px] text-gray-400 font-medium mt-0.5">{m.passType}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-rose-600">{dayjs(m.endDate).format('MM/DD')} 만료</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">{dayjs(m.endDate).diff(today, 'day')}일 남음</p>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        </AnimatePresence>
                        
                        {upcomingRenewals.length === 0 && (
                            <div className="w-full py-12 text-center text-gray-400 text-sm italic bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                이번 달 만료 예정인 회원이 없습니다.
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* [A] Program Attendance Chart */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-indigo-600 mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
                        당월 프로그램별 평균 출석률
                    </h3>
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={attendanceStats.programData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 500 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 500 }} />
                                <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="avg" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* [C] Membership Distribution */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative">
                    <div className="absolute top-6 right-6 px-3 py-1 bg-amber-50 border border-amber-100 rounded-full">
                        <span className="text-[11px] font-bold text-amber-600">현재 유효 회원: {activeMembersCount}명</span>
                    </div>
                    <h3 className="text-lg font-bold text-indigo-600 mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                        이용권 분포 현황
                    </h3>
                    <div className="h-[280px] w-full">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                                        {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <EmptyState />}
                    </div>
                    <div className="mt-4 space-y-1.5">
                        {pieData.slice(0, 5).map((item, index) => (
                            <div key={item.name} className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                    <span className="text-[11px] text-gray-600 font-medium truncate max-w-[140px]">{item.name}</span>
                                </div>
                                <span className="text-[11px] font-bold text-gray-900">{item.value}명</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* [B] Time Slot Attendance Chart */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-indigo-600 mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-amber-500 rounded-full"></span>
                    시간대별 붐비는 정도 (평균 인원)
                </h3>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={attendanceStats.timeSlotData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 500 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 500 }} />
                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                            <Line type="monotone" dataKey="avg" stroke="#f59e0b" strokeWidth={4} dot={{ r: 6, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
