interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  /** Tailwind colour class for the "on" track. */
  onColor?: string;
}

/** A sleek fintech toggle switch (48px+ touch target) for dark olive surfaces. */
export default function Switch({ checked, onChange, label, onColor = 'bg-[#C9F43A]' }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-12 w-[5.5rem] shrink-0 rounded-full border border-[#344E24] p-1 transition-colors focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#C9F43A] ${
        checked ? onColor : 'bg-[#0C1408]'
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex h-9 w-9 items-center justify-center rounded-full text-base font-extrabold shadow transition-transform ${
          checked ? 'translate-x-[2.55rem] bg-[#0B1307] text-[#D9F76E]' : 'bg-[#2B401E] text-[#D9F76E]'
        }`}
      >
        {checked ? '✓' : ''}
      </span>
    </button>
  );
}
