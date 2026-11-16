import { useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { ThemePreference, useTheme } from '../lib/theme';

interface AppearanceDialogProps {
  open: boolean;
  onClose: () => void;
  hasMobileSearch?: boolean;
}

const options: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  icon: 'sun' | 'moon' | 'system';
}> = [
  { value: 'system', label: 'Auto', description: 'Follow system settings', icon: 'system' },
  { value: 'light', label: 'Light', description: 'Use the light appearance', icon: 'sun' },
  { value: 'dark', label: 'Dark', description: 'Use the dark appearance', icon: 'moon' }
];

export const AppearanceDialog = ({ open, onClose, hasMobileSearch = false }: AppearanceDialogProps) => {
  const { preference, setPreference } = useTheme();
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 bg-black/50 dark:bg-black/40 ${
          hasMobileSearch ? 'top-[125px] md:top-[72px]' : 'top-[72px]'
        }`}
        aria-hidden="true"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="appearance-title"
        className="relative z-10 w-full max-w-xl rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6 shadow-2xl sm:p-9"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="appearance-title" className="font-display text-3xl font-semibold">
              Appearance
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Choose how Inkwell looks on this device.
            </p>
          </div>
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
            aria-label="Close appearance settings"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="mt-7 overflow-hidden rounded-xl border border-[var(--line)]">
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPreference(option.value)}
              className={`focus-ring flex w-full items-center gap-4 bg-[var(--panel)] px-5 py-4 text-left transition hover:bg-[var(--surface)] ${index ? 'border-t border-[var(--line)]' : ''}`}
              aria-pressed={preference === option.value}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center text-[var(--muted)]">
                {option.icon === 'system' ? <SystemIcon /> : <Icon name={option.icon} size={23} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{option.label}</span>
                <span className="mt-0.5 block text-xs text-[var(--muted)]">{option.description}</span>
              </span>
              <span className="grid h-7 w-7 place-items-center text-[#2563eb]">
                {preference === option.value && <Icon name="check" size={21} />}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded-lg bg-[#2563eb] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
          >
            Done
          </button>
        </div>
      </section>
    </div>
  );
};

const SystemIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden="true"
  >
    <rect x="3" y="5" width="18" height="12" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);
