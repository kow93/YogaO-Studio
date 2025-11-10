import React, { useState } from 'react';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

interface LoginProps {
    auth: Auth;
}

export const Login: React.FC<LoginProps> = ({ auth }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    
    const handleAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (err: any) {
            console.error(err.message);
            switch (err.code) {
                case 'auth/invalid-email':
                    setError('유효하지 않은 이메일 주소입니다.');
                    break;
                case 'auth/user-not-found':
                    setError('존재하지 않는 사용자입니다. 회원가입을 진행해주세요.');
                    break;
                case 'auth/wrong-password':
                    setError('비밀번호가 일치하지 않습니다.');
                    break;
                case 'auth/email-already-in-use':
                     setError('이미 사용 중인 이메일입니다.');
                    break;
                case 'auth/weak-password':
                    setError('비밀번호는 6자 이상이어야 합니다.');
                    break;
                default:
                    setError('로그인 또는 회원가입 중 오류가 발생했습니다.');
            }
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-lg">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-800">🧘‍♀️ Yogao Studio Manager</h1>
                    <p className="mt-2 text-gray-600">{isLogin ? '로그인하여 스튜디오 관리를 시작하세요.' : '계정을 생성하여 시작하세요.'}</p>
                </div>
                <form className="space-y-6" onSubmit={handleAuthAction}>
                    <div>
                        <label htmlFor="email" className="text-sm font-medium text-gray-700">
                            이메일
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="email@example.com"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="text-sm font-medium text-gray-700"
                        >
                            비밀번호
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="6자 이상 입력"
                        />
                    </div>
                    
                    {error && <p className="text-sm text-red-600 text-center">{error}</p>}

                    <div>
                        <button
                            type="submit"
                            className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            {isLogin ? '로그인' : '회원가입'}
                        </button>
                    </div>
                </form>

                <div className="text-sm text-center">
                    <button onClick={() => {setIsLogin(!isLogin); setError('')}} className="font-medium text-indigo-600 hover:text-indigo-500">
                        {isLogin ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
                    </button>
                </div>
            </div>
        </div>
    );
};
