"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import { deleteTrail, type DeleteTrailState } from "./actions";

interface DeleteTrailButtonProps {
  trailId: string;
  trailName: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
    >
      {pending ? "מוחק…" : "מחק את המסלול"}
    </button>
  );
}

export function DeleteTrailButton({
  trailId,
  trailName,
}: DeleteTrailButtonProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<DeleteTrailState, FormData>(
    deleteTrail,
    {},
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:underline"
      >
        <Trash2 className="size-3.5" />
        מחיקה
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-5 shadow-lg">
        <h2 className="text-lg font-bold text-ink">מחיקת מסלול</h2>
        <form action={formAction} className="mt-4 space-y-4">
          <input type="hidden" name="id" value={trailId} />
          <p className="text-sm text-muted-foreground">
            פעולה זו תמחק לצמיתות את המסלול &rdquo;{trailName}&ldquo; ואת היציאות
            שאין להן הזמנות. לא ניתן לבטל פעולה זו.
          </p>

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium"
            >
              חזרה
            </button>
            <SubmitButton />
          </div>
        </form>
      </div>
    </div>
  );
}
