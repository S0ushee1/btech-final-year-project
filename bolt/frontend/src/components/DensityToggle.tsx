import { useEffect, useState } from 'react';
import { Rows2, List } from 'lucide-react';

type Density = 'comfortable' | 'compact';

const KEY = 'tv_ui_density';

export function DensityToggle() {
  const [density, setDensity] = useState<Density>('comfortable');

  useEffect(() => {
    const saved = localStorage.getItem(KEY) as Density | null;
    const next = saved === 'compact' ? 'compact' : 'comfortable';
    setDensity(next);
    document.body.setAttribute('data-density', next);
  }, []);

  const toggle = () => {
    const next: Density = density === 'comfortable' ? 'compact' : 'comfortable';
    setDensity(next);
    document.body.setAttribute('data-density', next);
    localStorage.setItem(KEY, next);
  };

  return (
    <button
      onClick={toggle}
      className="nav-link"
      aria-label={`Switch to ${density === 'comfortable' ? 'compact' : 'comfortable'} density`}
      title={`Density: ${density}`}
      type="button"
    >
      <span className="inline-flex items-center gap-2">
        {density === 'comfortable' ? <Rows2 className="w-4 h-4" /> : <List className="w-4 h-4" />}
        <span className="hidden lg:inline">{density === 'comfortable' ? 'Comfort' : 'Compact'}</span>
      </span>
    </button>
  );
}
