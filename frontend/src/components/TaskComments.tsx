import { FormEvent, useEffect, useState } from 'react';

import api from '@/api/client';

type Comment = {
  id: number;
  username: string;
  text: string;
  created_at: string;
};

export function TaskComments({ taskId }: { taskId: number }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');

  const load = () => {
    api.get<Comment[]>(`/extras/tasks/${taskId}/comments`).then((r) => setComments(r.data));
  };

  useEffect(() => {
    load();
  }, [taskId]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    await api.post(`/extras/tasks/${taskId}/comments`, { text: text.trim() });
    setText('');
    load();
  };

  return (
    <div className="mt-2 border-t border-slate-200/60 pt-2 dark:border-slate-700/60">
      <ul className="mb-2 space-y-1 text-xs text-muted">
        {comments.map((c) => (
          <li key={c.id}>
            <strong className="text-body">{c.username}:</strong> {c.text}
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="flex gap-1">
        <input
          className="input-field flex-1 text-xs"
          placeholder="Комментарий..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="rounded bg-slate-700 px-2 text-xs text-white dark:bg-slate-500">
          OK
        </button>
      </form>
    </div>
  );
}
