'use client';

import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 px-4 py-3.5 text-left transition-all hover:border-ring/40"
    >
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-secondary'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { browserNotifications, remindersOnDashboard, updateSettings } = useSettings();

  const enableNotifications = async () => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      updateSettings({ browserNotifications: permission === 'granted' });
      return;
    }
    updateSettings({ browserNotifications: !browserNotifications });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Customize how Productivity Hub looks and notifies you.
        </p>
      </div>

      {/* Appearance */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-bold">🎨 Appearance</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how the app looks. Your preference is saved on this device.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => setTheme('light')}
            className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
              theme === 'light'
                ? 'border-primary bg-accent'
                : 'border-border hover:border-ring/40'
            }`}
          >
            <span className="flex h-14 w-20 items-center justify-center rounded-lg border border-border bg-white text-lg shadow-sm">
              ☀️
            </span>
            <span className="text-sm font-semibold">Light</span>
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
              theme === 'dark'
                ? 'border-primary bg-accent'
                : 'border-border hover:border-ring/40'
            }`}
          >
            <span className="flex h-14 w-20 items-center justify-center rounded-lg border border-[#22304d] bg-[#0b1120] text-lg">
              🌙
            </span>
            <span className="text-sm font-semibold">Dark</span>
          </button>
        </div>
      </section>

      {/* Notifications */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-bold">🔔 Notifications</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Control reminders and alerts.
        </p>

        <div className="mt-4 space-y-3">
          <Toggle
            checked={remindersOnDashboard}
            onChange={(v) => updateSettings({ remindersOnDashboard: v })}
            label="Reminders widget on dashboard"
            description="Show due-today and overdue tasks/events on the dashboard."
          />

          <Toggle
            checked={browserNotifications}
            onChange={enableNotifications}
            label="Browser notifications"
            description={
              typeof Notification !== 'undefined' && Notification.permission === 'denied'
                ? 'Notifications are blocked in your browser — enable them in site settings.'
                : 'Get a desktop notification for tasks and events you marked with a reminder.'
            }
          />
        </div>

        {typeof Notification !== 'undefined' && Notification.permission === 'granted' && (
          <button
            onClick={() => new Notification('✅ Notifications active', { body: 'You will now receive reminders here.' })}
            className="mt-4 rounded-lg border border-border px-3 py-2 text-xs font-semibold transition-colors hover:bg-secondary"
          >
            Test notification
          </button>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Appearance and notification preferences are stored locally in your browser.
      </p>
    </div>
  );
}
