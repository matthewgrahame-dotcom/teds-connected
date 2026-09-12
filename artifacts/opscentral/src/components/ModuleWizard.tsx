import { useState } from 'react';
import { ExternalLink, ChevronLeft, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RichContent } from '@/components/RichContent';
import { QuizTaker } from '@/components/QuizTaker';
import { getYouTubeEmbedId } from '@/lib/youtube';

type WizardModule = {
  id: number;
  title: string;
  content: string | null;
  externalUrl: string | null;
  hasQuiz: boolean;
};

// Real two-screen flow matching the reference screenshots: an Intro screen
// (video + lesson text + a "Start" button) that transitions to a separate
// Quiz screen, rather than everything showing at once on one scrollable
// panel. Skips straight to the quiz screen if there's no video/content to
// show first (nothing to "start" from).
export function ModuleWizard({ module, onClose, onQuizDone }: { module: WizardModule; onClose: () => void; onQuizDone: () => void }) {
  const embedId = getYouTubeEmbedId(module.externalUrl);
  const hasIntro = !!module.content || !!embedId;
  const [step, setStep] = useState<'intro' | 'quiz'>(hasIntro ? 'intro' : 'quiz');

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{module.title}</DialogTitle>
        </DialogHeader>

        {step === 'intro' && (
          <div className="space-y-4">
            {embedId && (
              <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
                <iframe
                  src={`https://www.youtube.com/embed/${embedId}`}
                  title={module.title}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
            {module.externalUrl && !embedId && (
              <a href={module.externalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline">
                <ExternalLink className="h-3 w-3" /> This video can't be embedded here — open it directly
              </a>
            )}
            {module.content && (
              <div className="max-h-[45vh] overflow-y-auto pr-1">
                <RichContent text={module.content} />
              </div>
            )}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <button type="button" onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground">
                Back
              </button>
              {module.hasQuiz ? (
                <button type="button" onClick={() => setStep('quiz')} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground transition hover:brightness-95">
                  Start
                </button>
              ) : (
                <button type="button" onClick={onClose} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground transition hover:brightness-95">
                  Done
                </button>
              )}
            </div>
          </div>
        )}

        {step === 'quiz' && module.hasQuiz && (
          <div className="space-y-3">
            {hasIntro && (
              <button type="button" onClick={() => setStep('intro')} className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-3.5 w-3.5" /> Back to intro
              </button>
            )}
            <div className="flex items-start gap-2 rounded-md border border-yellow-300/60 bg-yellow-50 px-3 py-2.5 text-sm text-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
              Note: Feedback will only be shown to you after you complete the quiz.
            </div>
            <QuizTaker moduleId={module.id} onDone={onQuizDone} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
