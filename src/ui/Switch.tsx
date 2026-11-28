interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  /** Tailwind colour class for the "on" track. */
  onColor?: string;
}

/** A large toggle switch (48px touch target). */
export default function Switch({ checked, onChange, label, onColor = 'grad-accent' }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-12 w-[5.5rem] shrink-0 rounded-full p-1 transition-colors focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#FF7A2F] ${
        checked ? onColor : 'bg-white/15'
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex h-10 w-10 items-center justify-center rounded-full bg-white text-base font-extrabold text-[#FF9A4D] shadow transition-transform ${
          checked ? 'translate-x-[2.5rem]' : ''
        }`}
      >
        {checked ? '✓' : ''}
      </span>
    </button>
  );
}
