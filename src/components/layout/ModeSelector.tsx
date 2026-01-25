import { useExecutionStore } from '@/stores';
import { Toggle } from '@/components/ui';
import type { ExecutionMode } from '@/types';

const modes: { id: ExecutionMode; label: string; desc: string }[] = [
  { id: 'plan', label: 'Plan', desc: 'Plan before acting' },
  { id: 'ask', label: 'Ask', desc: 'Ask before changes' },
  { id: 'auto', label: 'Auto', desc: 'Full autonomy' },
];

export function ModeSelector() {
  const { mode, setMode, neverStop, setNeverStop } = useExecutionStore();

  return (
    <div className="mode-selector">
      <div className="mode-label">Mode</div>
      <div className="mode-buttons">
        {modes.map((m) => (
          <button
            key={m.id}
            className={`mode-btn ${mode === m.id ? 'active' : ''}`}
            onClick={() => setMode(m.id)}
            title={m.desc}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="mode-option">
        <span className="mode-option-label">Never stop</span>
        <Toggle checked={neverStop} onChange={setNeverStop} />
      </div>
    </div>
  );
}
