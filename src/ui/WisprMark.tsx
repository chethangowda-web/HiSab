/** A small waveform mark used next to "Wispr Flow". Decorative. */
export default function WisprMark({ className = 'h-4 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 16" className={`inline-block ${className}`} fill="currentColor">
      <rect x="0" y="5" width="3" height="6" rx="1.5" />
      <rect x="5.5" y="1" width="3" height="14" rx="1.5" />
      <rect x="11" y="3" width="3" height="10" rx="1.5" />
      <rect x="16.5" y="6" width="3" height="4" rx="1.5" />
    </svg>
  );
}
