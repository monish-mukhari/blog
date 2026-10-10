import { Icon } from './Icon';
export const Quote = () => (
  <div className="grain relative flex h-screen flex-col justify-between overflow-hidden bg-[#2563eb] p-12 text-white">
    <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border-[55px] border-white/10" />
    <div />
    <div className="relative max-w-xl">
      <span className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[.16em]">
        <Icon name="spark" size={15} />
        Writer spotlight
      </span>
      <blockquote className="mt-8 font-display text-5xl font-medium leading-[1.08]">
        “There is no greater agony than bearing an untold story inside you.”
      </blockquote>
      <div className="mt-8 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-white font-bold text-[#2563eb]">
          MA
        </div>
        <div>
          <p className="font-semibold">Maya Angelou</p>
          <p className="text-sm text-white/70">Poet, memoirist, storyteller</p>
        </div>
      </div>
    </div>
    <p className="relative max-w-sm text-sm leading-6 text-white/65">
      Join a community built around curiosity, clarity, and the brave act of putting your ideas into words.
    </p>
  </div>
);
