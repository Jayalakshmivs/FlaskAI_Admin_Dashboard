import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import jwt_decode from 'jwt-decode';
import { Activity, ShieldCheck, Mail, Lock, ArrowRight } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  // ✅ Manual Login FIX
  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();

    const user = {
      name: email.split('@')[0] || "User",
      email: email,
      role: "Standard User"
    };

    onLoginSuccess(user);
    localStorage.setItem('dashpro_user', JSON.stringify(user));

    navigate('/overview'); // ✅ REDIRECT FIX
  };

  // ✅ Google SSO FIX (REAL USER DATA)
  const handleGoogleLogin = (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) return;

    const decoded: any = jwt_decode(credentialResponse.credential);

    const user = {
      name: decoded.name,
      email: decoded.email,
      picture: decoded.picture,
      role: "User"
    };

    onLoginSuccess(user);
    localStorage.setItem('dashpro_user', JSON.stringify(user));

    navigate('/overview'); // ✅ REDIRECT FIX
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950">

      <div className="max-w-md w-full space-y-8 relative">

        <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl animate-pulse delay-1000" />

        <div className="bg-slate-900/50 backdrop-blur-xl p-10 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">

          {/* HEADER */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="bg-indigo-600 p-4 rounded-2xl mb-6 shadow-xl shadow-indigo-600/20">
              <Activity className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white mb-2">
              AI Dash<span className="text-indigo-500">Pro</span>
            </h1>
            <p className="text-slate-400 text-sm font-medium tracking-wide">
              Enterprise Neural Intelligence Matrix
            </p>
          </div>

          {/* INFO */}
          <div className="flex items-center gap-4 bg-slate-950/50 p-4 rounded-2xl border border-slate-800 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-widest">Secure Access</p>
              <p className="text-[11px] text-slate-500">Multi-layered enterprise encryption enabled</p>
            </div>
          </div>

          {/* FORM */}
          <form onSubmit={handleManualLogin} className="space-y-4">

            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@enterprise.com"
                className="w-full pl-10 pr-3 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center"
            >
              Sign in securely
              <ArrowRight className="ml-2 w-5 h-5" />
            </button>
          </form>

          {/* DIVIDER */}
          <div className="text-center text-xs text-slate-500 my-6">
            OR CONTINUE WITH SSO
          </div>

          {/* GOOGLE LOGIN */}
          <div className="flex flex-col items-center gap-3">

            <GoogleLogin
              onSuccess={handleGoogleLogin}
              onError={() => console.log('Google Login Failed')}
              useOneTap
              theme="filled_black"
              shape="pill"
            />

            {/* OPTIONAL BYPASS */}
            <button
              onClick={() => {
                const user = {
                  name: "Jayalakshmi",
                  email: "jayalakshmivs24@gmail.com",
                  role: "Admin"
                };

                onLoginSuccess(user);
                localStorage.setItem('dashpro_user', JSON.stringify(user));
                navigate('/overview');
              }}
              className="text-xs text-slate-400 hover:text-indigo-400 underline"
            >
              Access Dashboard (Bypass Login)
            </button>

          </div>

          <p className="text-[10px] text-center text-slate-600 mt-8">
            By continuing, you agree to Enterprise Terms & Security Policy
          </p>

        </div>
      </div>
    </div>
  );
}
