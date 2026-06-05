import { useState, type ReactNode } from 'react';

type SupportSection = {
  id: string;
  title: string;
  content: ReactNode;
};

const SECTIONS: SupportSection[] = [
  {
    id: 'contacts',
    title: 'Контакты администрации',
    content: (
      <div className="space-y-2 text-sm text-body">
        <p>
          <span className="text-muted">Диспетчерская:</span> +7 (495) 000-00-00
        </p>
        <p>
          <span className="text-muted">Email:</span> admin@dorm.example.ru
        </p>
        <p>
          <span className="text-muted">Часы работы:</span> пн–пт 9:00–18:00, сб 10:00–15:00
        </p>
        <p>
          <span className="text-muted">Кабинет:</span> корпус C1, 1 этаж, комната 101
        </p>
      </div>
    ),
  },
  {
    id: 'complaints',
    title: 'Обращение с жалобами',
    content: (
      <div className="space-y-3 text-sm text-body">
        <p>
          Жалобы на шум, нарушения порядка или состояние квартиры принимаются через форму или
          лично у дежурного администратора.
        </p>
        <p>
          <span className="text-muted">Форма:</span> complaints@dorm.example.ru
        </p>
        <p className="text-xs text-slate-500">
          Укажите корпус, номер квартиры и суть обращения. Ответ — в течение 3 рабочих дней.
        </p>
      </div>
    ),
  },
  {
    id: 'feedback',
    title: 'Обратная связь',
    content: (
      <div className="space-y-3 text-sm text-body">
        <p>Предложения по улучшению сервиса и приложения приветствуются.</p>
        <p>
          <span className="text-muted">Telegram:</span> @dorm_support
        </p>
        <p>
          <span className="text-muted">Email:</span> feedback@dorm.example.ru
        </p>
      </div>
    ),
  },
  {
    id: 'rules',
    title: 'Правила проживания',
    content: (
      <ul className="space-y-2 text-sm text-body list-disc list-inside">
        <li>Тишина с 23:00 до 7:00</li>
        <li>Уборка общих зон по расписанию — обязательна для всех жильцов</li>
        <li>Курение только в отведённых местах</li>
        <li>Гости — до 23:00, с согласования ответственного за квартиру</li>
        <li>Запрещено хранение легковоспламеняющихся вещей в комнатах</li>
      </ul>
    ),
  },
  {
    id: 'callisto',
    title: 'Услуги Каллисто',
    content: (
      <div className="space-y-2 text-sm text-body">
        <p>Сервис «Каллисто» — дополнительные услуги для жильцов:</p>
        <ul className="list-disc list-inside space-y-1 text-muted">
          <li>Химчистка и прачечная</li>
          <li>Мелкий ремонт в комнате</li>
          <li>Доставка постельного белья</li>
          <li>Уборка по индивидуальному графику</li>
        </ul>
        <p className="pt-2">
          <span className="text-muted">Заказ:</span> callisto@dorm.example.ru или стойка C1
        </p>
      </div>
    ),
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SupportMenu({ open, onClose }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  if (!open) return null;

  const active = SECTIONS.find((s) => s.id === activeId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg card-shell overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-title"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 id="support-title" className="text-lg font-semibold text-heading">
            Обращение в поддержку
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-slate-900 dark:hover:text-white text-xl leading-none"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4">
          {!active ? (
            <ul className="space-y-2">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(section.id)}
                    className="w-full text-left px-4 py-3 rounded-xl list-item-shell hover:border-sky-400 dark:hover:border-sky-500/50 text-sm text-body transition-colors"
                  >
                    {section.title}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setActiveId(null)}
                className="text-xs link-accent mb-3"
              >
                ← Назад к разделам
              </button>
              <h3 className="text-base font-medium text-heading mb-3">{active.title}</h3>
              {active.content}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
