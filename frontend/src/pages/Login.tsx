import { useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import { AppContainer } from '@/components/layout/AppContainer';

export default function Login() {
  const [formData, setFormData] = useState({ login: '', password: '' });
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loggedIn = await login(formData.login, formData.password);
    if (loggedIn) {
      toast.success('Добро пожаловать!');
      navigate(loggedIn.is_admin ? '/admin' : '/dashboard');
    } else {
      toast.error('Ошибка входа');
    }
  };

  return (
    <div className="page-shell min-h-screen flex flex-col">
      <AppContainer className="flex-1 flex items-center justify-center py-8 lg:py-12">
      <div className="w-full max-w-md lg:max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-heading">Cleaning App</h1>
          <p className="mt-2 text-sm text-muted">Войдите в аккаунт, чтобы управлять уборками</p>
        </div>

        <div className="card-shell p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-body mb-2">Логин или email</label>
              <input
                type="text"
                value={formData.login}
                onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                className="input-field"
                placeholder="Логин или email"
                autoComplete="username"
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
                placeholder="Пароль"
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full py-2.5 text-sm">
              Войти
            </button>
          </form>

          <p className="mt-4 text-xs text-muted text-center">
            <Link to="/forgot-password" className="link-accent">
              Забыли пароль?
            </Link>
          </p>
          <p className="mt-2 text-xs text-muted text-center">
            Нет аккаунта?{' '}
            <Link to="/register" className="link-accent">
              Зарегистрироваться
            </Link>
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-3 w-full btn-secondary py-1.5 text-xs"
          >
            На главную
          </button>
        </div>
      </div>
      </AppContainer>
    </div>
  );
}
