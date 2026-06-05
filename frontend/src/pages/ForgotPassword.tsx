import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import api from '@/api/client';
import { AppContainer } from '@/components/layout/AppContainer';
import { getApiErrorMessage } from '@/utils/apiError';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [devCode, setDevCode] = useState<string | null>(null);

  const requestReset = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post<{ message: string; dev_code?: string }>(
        '/users/forgot-password',
        { email },
      );
      toast.success(res.data.message);
      if (res.data.dev_code) setDevCode(res.data.dev_code);
      setStep('reset');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Ошибка'));
    }
  };

  const applyReset = async (e: FormEvent) => {
    e.preventDefault();
    const normalized = code.replace(/\D/g, '').slice(0, 6);
    if (normalized.length !== 6) {
      toast.error('Введите 6-значный код из письма');
      return;
    }
    try {
      await api.post('/users/reset-password', {
        code: normalized,
        new_password: newPassword,
      });
      toast.success('Пароль изменён');
      navigate('/login');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Ошибка сброса'));
    }
  };

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <AppContainer className="flex flex-1 items-center justify-center py-8">
        <div className="card-shell w-full max-w-md space-y-6 p-6">
          <h1 className="text-heading text-xl font-semibold">Восстановление пароля</h1>

          {step === 'request' ? (
            <form onSubmit={requestReset} className="space-y-3">
              <p className="text-muted text-sm">
                Укажите email, указанный при регистрации. Мы отправим 6-значный код.
              </p>
              <input
                type="email"
                required
                className="input-field w-full"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit" className="btn-primary w-full py-2 text-sm">
                Отправить код
              </button>
            </form>
          ) : (
            <form onSubmit={applyReset} className="space-y-3">
              <p className="text-muted text-sm">
                Код отправлен на <strong className="text-body">{email}</strong>
              </p>
              {devCode && (
                <p className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-100">
                  Режим разработки (SMTP выключен): код <code className="font-mono text-base">{devCode}</code>
                </p>
              )}
              <input
                className="input-field w-full text-center font-mono text-lg tracking-widest"
                placeholder="000000"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <input
                type="password"
                className="input-field w-full"
                placeholder="Новый пароль (мин. 6 символов)"
                minLength={6}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button type="submit" className="btn-primary w-full py-2 text-sm">
                Установить пароль
              </button>
              <button
                type="button"
                className="text-muted w-full text-xs hover:underline"
                onClick={() => setStep('request')}
              >
                Отправить код повторно
              </button>
            </form>
          )}

          <Link to="/login" className="text-sm text-sky-600 hover:underline">
            Назад ко входу
          </Link>
        </div>
      </AppContainer>
    </div>
  );
}
