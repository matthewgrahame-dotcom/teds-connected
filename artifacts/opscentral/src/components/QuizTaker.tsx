import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { authHeaders } from '@/lib/sessionAuth';

type QuizQuestion = {
  id: number;
  questionText: string;
  questionType: 'single' | 'multi' | 'text';
  options: string[];
};

type QuizResult = { scorePercent: number; passed: boolean; correctCount: number; totalScorable: number };

export function QuizTaker({ moduleId, onDone }: { moduleId: number; onDone: () => void }) {
  const { session } = useAuth();
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [passThresholdPercent, setPassThresholdPercent] = useState(100);
  const [answers, setAnswers] = useState<Record<number, number[]>>({});
  const [textAnswers, setTextAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    fetch(`/api/training/modules/${moduleId}/quiz`, { headers: authHeaders(session) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        setQuestions(data.questions);
        setPassThresholdPercent(data.passThresholdPercent);
      })
      .catch(() => setQuestions([]));
  }, [moduleId]);

  const toggleOption = (question: QuizQuestion, optionIndex: number) => {
    setAnswers((prev) => {
      const current = prev[question.id] ?? [];
      if (question.questionType === 'single') return { ...prev, [question.id]: [optionIndex] };
      const next = current.includes(optionIndex) ? current.filter((i) => i !== optionIndex) : [...current, optionIndex];
      return { ...prev, [question.id]: next };
    });
  };

  const scorableQuestions = (questions ?? []).filter((q) => q.questionType !== 'text');
  const allAnswered = scorableQuestions.every((q) => (answers[q.id] ?? []).length > 0);

  const submit = async () => {
    if (!session?.name) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/training/modules/${moduleId}/quiz/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify({ staffName: session.name, answers }),
      });
      const data = await res.json();
      if (res.ok) setResult(data);
    } finally {
      setSubmitting(false);
    }
  };

  if (questions === null) return <p className="px-5 pb-4 text-sm text-muted-foreground">Loading quiz…</p>;

  if (result) {
    return (
      <div className="px-5 pb-4">
        <div className={`flex items-center gap-3 rounded-lg border p-4 ${result.passed ? 'border-primary/40 bg-primary/5' : 'border-destructive/40 bg-destructive/5'}`}>
          {result.passed ? <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /> : <XCircle className="h-5 w-5 shrink-0 text-destructive" />}
          <div>
            <p className="text-sm font-extrabold text-foreground">
              {result.passed ? 'Passed!' : 'Not quite — try again'} · {result.scorePercent}% ({result.correctCount}/{result.totalScorable} correct)
            </p>
            <p className="text-xs text-muted-foreground">Pass mark: {passThresholdPercent}%</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          {!result.passed && (
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setAnswers({});
              }}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-extrabold text-primary-foreground hover:brightness-95"
            >
              Retake Quiz
            </button>
          )}
          <button type="button" onClick={onDone} className="rounded-md border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-5 pb-4">
      {questions.length === 0 && <p className="text-sm text-muted-foreground">No quiz questions for this module.</p>}
      {questions.map((q, i) => (
        <div key={q.id} className="rounded-lg border border-border p-3">
          <p className="text-sm font-semibold text-foreground">
            {i + 1}. {q.questionText}
          </p>
          {q.questionType === 'text' ? (
            <textarea
              value={textAnswers[q.id] ?? ''}
              onChange={(e) => setTextAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
              placeholder="Your answer (not scored — for reflection)"
              rows={2}
              className="mt-2 w-full resize-none rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-accent"
            />
          ) : (
            <div className="mt-2 space-y-1.5">
              {q.options.map((opt, oi) => {
                const selected = (answers[q.id] ?? []).includes(oi);
                return (
                  <button
                    key={oi}
                    type="button"
                    onClick={() => toggleOption(q, oi)}
                    className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition ${selected ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-foreground/80 hover:bg-muted'}`}
                  >
                    <span className={`grid h-4 w-4 shrink-0 place-items-center border text-[10px] ${q.questionType === 'single' ? 'rounded-full' : 'rounded'} ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'}`}>
                      {selected && '✓'}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
      {questions.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={!allAnswered || submitting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground transition hover:brightness-95 disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit Quiz'}
          </button>
          {!allAnswered && <p className="text-xs text-muted-foreground">Answer every question to submit.</p>}
        </div>
      )}
    </div>
  );
}
