/** A friendly message for a list with nothing in it yet. */
export default function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-slate-200">
      <span aria-hidden="true" className="text-5xl">
        {icon}
      </span>
      <p className="text-xl text-slate-600">{text}</p>
    </div>
  );
}
