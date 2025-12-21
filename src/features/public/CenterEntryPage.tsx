import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { centerService } from '../../services';
import type { Center } from '../../types';
import { useAuthStore } from '../../stores/auth.store';

export const CenterEntryPage: React.FC = () => {
  const { centerSlug, testType } = useParams<{ centerSlug: string; testType: string }>();
  const [center, setCenter] = useState<Center | null>(null);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const authLogin = useAuthStore(state => state.login);

  useEffect(() => {
    if (centerSlug) {
      centerService.getCenterBySlug(centerSlug).then(setCenter);
    }
  }, [centerSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authLogin(login, password);
      // Determine where to redirect based on role
      const user = useAuthStore.getState().user;
      if (user?.role === 'STUDENT') navigate('/student');
      else if (user?.role === 'CENTER_ADMIN') navigate('/admin');
      else if (user?.role === 'SUPER_ADMIN') navigate('/super');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (!center) return <div className="p-8 text-center">Loading center info...</div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
        {center.logoUrl && (
          <img src={center.logoUrl} alt={center.name} className="h-16 mx-auto mb-4" />
        )}
        <h2 className="text-2xl font-bold text-gray-800">{center.name}</h2>
        <p className="text-gray-500 mb-8 uppercase tracking-widest text-sm">{testType} ENTRANCE</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input 
              type="text" 
              placeholder="Login" 
              value={login}
              onChange={e => setLogin(e.target.value)}
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>
          <div>
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading ? 'Logging in...' : 'START'}
          </button>
        </form>
      </div>
    </div>
  );
};

