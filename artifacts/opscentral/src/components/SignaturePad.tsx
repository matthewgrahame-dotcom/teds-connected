import { useEffect, useRef, useState } from 'react';

// Draw-to-sign canvas. Captures the result as a PNG data URL on pointer-up
// and reports it via onChange, matching the same controlled string-value
// pattern every other FormPage field already uses (values[field.key] is a
// plain string) -- no special-casing needed in the submission payload,
// a signature is just a (long) string like any other field value.
export function SignaturePad({ value, onChange, required }: { value: string; onChange: (dataUrl: string) => void; required?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(!!value);

  // Canvas internal resolution is fixed regardless of its displayed CSS
  // size, so drawing stays crisp -- set once on mount, not on every
  // render (which would clear whatever's already drawn).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(2, 2);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#1a1a1a';
    }
    // Restore a previously-saved signature (e.g. navigating back to this
    // field) by drawing the stored data URL back onto the fresh canvas.
    if (value) {
      const img = new Image();
      img.onload = () => ctx?.drawImage(img, 0, 0, canvas.width / 2, canvas.height / 2);
      img.src = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    const ctx = canvasRef.current?.getContext('2d');
    const { x, y } = getPos(e);
    ctx?.beginPath();
    ctx?.moveTo(x, y);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    const { x, y } = getPos(e);
    ctx?.lineTo(x, y);
    ctx?.stroke();
    setHasDrawn(true);
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onChange('');
  };

  return (
    <div>
      <canvas
        data-testid="signature-pad"
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className={`h-40 w-full touch-none rounded-md border bg-white ${required && !hasDrawn ? 'border-border' : 'border-border'}`}
        style={{ cursor: 'crosshair' }}
      />
      <button
        type="button"
        onClick={clear}
        className="mt-2 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted"
      >
        Clear Signature
      </button>
    </div>
  );
}
