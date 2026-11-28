/** Empty state card matching the Obsidian Olive & Lime fintech theme. */
export default function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="fintech-card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-full bg-[#223519] text-4xl ring-1 ring-[#3A5A2A]">
        {icon}
      </span>
      <p className="text-xl font-semibold text-[#D6E5C8]">{text}</p>
    </div>
  );
}
