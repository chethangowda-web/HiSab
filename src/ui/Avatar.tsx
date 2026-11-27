import { avatarColour, initialOf } from './typeStyle';

export default function Avatar({ name, size = 'h-12 w-12 text-xl' }: { name: string; size?: string }) {
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${avatarColour(name)} ${size}`}>
      {initialOf(name)}
    </span>
  );
}
