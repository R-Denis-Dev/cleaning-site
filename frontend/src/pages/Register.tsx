import { useState } from 'react';
import api from '@/api/client';
import { useAuth } from '@/app/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import { AppContainer } from '@/components/layout/AppContainer';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/users/', formData);
      const loggedIn = await login(formData.username, formData.password);
      if (loggedIn) {
        toast.success('Аккаунт создан!');
        navigate(loggedIn.is_admin ? '/admin' : '/dashboard');
      } else {
        navigate('/login');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Не удалось зарегистрироваться';
      toast.error(typeof msg === 'string' ? msg : 'Ошибка регистрации');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-shell min-h-screen flex flex-col">
      <AppContainer className="flex-1 flex items-center justify-center py-8 lg:py-12">
      <div className="w-full max-w-md lg:max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-heading">Cleaning App</h1>
          <p className="mt-2 text-sm text-muted">Создайте аккаунт для участия в уборках</p>
        </div>

        <div className="card-shell p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-body mb-2">Логин</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-body mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-body mb-2">Пароль</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="input-field"
                minLength={6}
                required
              />
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-2.5 text-sm">
              {isSubmitting ? 'Регистрируем…' : 'Зарегистрироваться'}
            </button>
          </form>
          <p className="mt-4 text-xs text-muted text-center">
            Уже есть аккаунт? <Link to="/login" className="link-accent">Войти</Link>
          </p>
        </div>
      </div>
      </AppContainer>
    </div>
  );
}
