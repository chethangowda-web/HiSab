/** Friendly empty state card. */
export default function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FDEEDE] text-4xl">
        {icon}
      </span>
      <p className="text-xl font-semibold text-[#1C1917]">{text}</p>
    </div>
  );
}
