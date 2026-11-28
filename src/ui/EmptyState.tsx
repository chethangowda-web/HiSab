/** Friendly empty state card. */
export default function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FF7A2F]/15 text-4xl">
        {icon}
      </span>
      <p className="text-xl font-semibold text-[#F5F3FA]">{text}</p>
    </div>
  );
}
