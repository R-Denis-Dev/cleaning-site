import { useNavigate } from 'react-router-dom';

import { AppContainer } from '@/components/layout/AppContainer';

export function MarketingLanding() {
  const navigate = useNavigate();

  return (
    <div className="page-shell min-h-screen flex flex-col">
      <AppContainer className="flex-1 flex items-center py-10 lg:py-16">
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 xl:gap-20 items-center">
        <div>
          <span className="badge-soft mb-4">Общежитие · без хаоса</span>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight text-heading">
            Уборка в общаге <span className="text-sky-600 dark:text-sky-300">без конфликтов</span>
          </h1>
          <p className="text-lg text-body mb-6">
            Cleaning App помогает честно распределять дежурства, следить за выполнением задач
            и сохранять порядок в общем пространстве.
          </p>

          <ul className="space-y-3 mb-8 text-body">
            <li className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 rounded-full bg-sky-500 shrink-0" />
              <span>Автоматическое расписание по дням недели для всей комнаты или квартиры.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 rounded-full bg-sky-500 shrink-0" />
              <span>Готовый чек‑лист задач: пол, кухня, ванная, мусор и многое другое.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 rounded-full bg-sky-500 shrink-0" />
              <span>Прозрачная история уборок — видно, кто и когда дежурил.</span>
            </li>
          </ul>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate('/register')}
              className="btn-primary inline-flex justify-center items-center px-6 py-3 text-sm font-semibold shadow-lg"
            >
              Начать бесплатно
            </button>
            <button
              onClick={() => navigate('/login')}
              className="btn-secondary inline-flex justify-center items-center px-6 py-3 text-sm font-semibold"
            >
              Уже с нами? Войти
            </button>
          </div>

          <p className="mt-4 text-sm text-muted">
            Не нужно ничего устанавливать — работает прямо в браузере.
          </p>
        </div>

        <div className="relative">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-sky-400/30 dark:bg-sky-700/40 rounded-full blur-3xl" />
          <div className="absolute -bottom-8 -left-6 w-40 h-40 bg-indigo-300/30 dark:bg-sky-600/25 rounded-full blur-3xl" />

          <div className="relative card-shell p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted">Текущая неделя</p>
                <p className="text-lg font-semibold text-heading">Расписание дежурств</p>
              </div>
              <span className="badge-soft">Демо</span>
            </div>

            <div className="space-y-2 mb-6">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day, index) => (
                <div
                  key={day}
                  className="flex items-center justify-between px-3 py-2 rounded-xl list-item-shell"
                >
                  <span className="text-sm text-body">{day}</span>
                  <span
                    className={`text-sm ${
                      index === 1
                        ? 'text-sky-700 dark:text-sky-200 font-medium'
                        : 'text-muted'
                    }`}
                  >
                    {index === 1 ? 'Вы' : index === 3 ? 'Сосед' : 'Свободно'}
                  </span>
                </div>
              ))}
            </div>

            <div className="list-item-shell rounded-xl p-4">
              <p className="text-sm font-semibold mb-2 text-heading">Задачи на сегодня</p>
              <ul className="space-y-1 text-sm text-body">
                <li>• Убрать пол</li>
                <li>• Выкинуть мусор</li>
                <li>• Помыть посуду</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      </AppContainer>
    </div>
  );
}
