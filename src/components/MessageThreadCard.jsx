import React, { useState } from 'react';
import { Check, Clock3, Send } from 'lucide-react';

function formatMessageTime(value) {
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function MessageThreadCard({ note, canReply = false, onReply }) {
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const sentReply = note.reply;
  const messageTime = formatMessageTime(note.createdAt);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const text = reply.trim();
    if (!text || sending || sentReply || !onReply) return;

    setSending(true);
    setError('');
    try {
      await onReply(note.id, text);
      setReply('');
    } catch (sendError) {
      console.error('Failed to send message reply:', sendError);
      setError('تعذر إرسال ردك. حاول مرة أخرى.');
    } finally {
      setSending(false);
    }
  };

  return (
    <article className="space-y-3">
      <div className="flex justify-start">
        <div className="max-w-[92%] rounded-2xl rounded-es-md border border-emerald-100 bg-white p-3.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px]">
            <span className="font-bold text-emerald-700 dark:text-emerald-400">
              {note.fromName || 'المشرف'}
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <Clock3 className="h-3 w-3" />
              {messageTime}
            </span>
          </div>
          <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 dark:text-slate-200">
            {note.text}
          </p>
        </div>
      </div>

      {sentReply && (
        <div className="flex justify-end">
          <div className="max-w-[92%] rounded-2xl rounded-ee-md bg-emerald-600 p-3.5 text-white shadow-sm">
            <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] text-emerald-100">
              <span className="font-bold">{sentReply.fromName || 'أنت'}</span>
              <span>{formatMessageTime(sentReply.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap break-words text-sm leading-7">
              {sentReply.text}
            </p>
            <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-emerald-100">
              <Check className="h-3 w-3" />
              تم الإرسال
            </span>
          </div>
        </div>
      )}

      {canReply && !sentReply && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex items-end gap-2">
            <textarea
              rows={2}
              maxLength={1000}
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder="اكتب ردًا واحدًا على رسالة المشرف..."
              aria-label="اكتب ردًا على رسالة المشرف"
              className="min-h-12 flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={!reply.trim() || sending}
              aria-label="إرسال الرد"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {sending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between px-1 text-[10px] text-slate-400">
            <span>يمكنك إرسال رد واحد فقط على هذه الرسالة</span>
            <span>{reply.length}/1000</span>
          </div>
          {error && <p role="alert" className="text-xs font-semibold text-rose-600">{error}</p>}
        </form>
      )}
    </article>
  );
}
