import { useState } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { Activity, ShieldCheck, Mail, Lock, ArrowRight } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      onLoginSuccess({
        name: email.split('@')[0] || "User",
        email: email,
        role: "Standard User" // Mock standard role
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950">
      <div className="max-w-md w-full space-y-8 relative">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl animate-pulse delay-1000" />

        <div className="bg-slate-900/50 backdrop-blur-xl p-10 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="bg-indigo-600 p-4 rounded-2xl mb-6 shadow-xl shadow-indigo-600/20">
              <Activity className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white mb-2">AI Dash<span className="text-indigo-500">Pro</span></h1>
            <p className="text-slate-400 text-sm font-medium tracking-wide">Enterprise Neural Intelligence Matrix</p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-slate-950/50 p-4 rounded-2xl border border-slate-800 group hover:border-indigo-500/50 transition-all">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-widest">Secure Access</p>
                <p className="text-[11px] text-slate-500">Multi-layered enterprise encryption enabled</p>
              </div>
            </div>

            <form onSubmit={handleManualLogin} className="space-y-4">
              <div className="space-y-3">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-xl leading-5 bg-slate-900/50 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all sm:text-sm"
                    placeholder="name@enterprise.com"
                  />
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-xl leading-5 bg-slate-900/50 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all sm:text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
              >
                Sign in securely
                <ArrowRight className="ml-2 h-5 w-5 text-indigo-200 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest leading-none">
                <span className="bg-slate-900 px-4 text-slate-600">Or continue with SSO</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 justify-center items-center">
              <GoogleLogin
                onSuccess={(credentialResponse: CredentialResponse) => {
                  console.log(credentialResponse);
                  onLoginSuccess({
                    name: "Jayalakshmi",
                    email: "[EMAIL_ADDRESS]",
                    role: "Premium Administrator"
                  });
                }}
                onError={() => {
                  console.log('Login Failed');
                }}
                useOneTap
                theme="filled_black"
                shape="pill"
              />

              <button
                type="button"
                onClick={() => onLoginSuccess({
                  name: "Jayalakshmi",
                  email: "jayalakshmivs24@gmail.com",
                  role: "Premium Administrator"
                })}
                className="text-[10px] text-slate-500 hover:text-indigo-400 underline underline-offset-4 transition-colors font-bold uppercase tracking-widest mt-2"
              >
                Access Dashboard (Bypass SSO)
              </button>
            </div>

            <p className="text-[10px] text-center text-slate-600 mt-8">
              By continuing, you agree to our Enterprise Terms of Service and Neural Security Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
