'use client';

import { useState } from 'react';
import { Button, Slider, Tooltip } from '@acme/ui';
import { useResizeTool } from './useResizeTool';
import { useCreditStore } from './creditStore';
import type { ResizePreset } from './types';

export function ResizeScreen({ imageId }: { imageId: string }) {
  const resize = useResizeTool(imageId);
  const [isPresetListOpen, setPresetListOpen] = useState(false);

  const ratioLabel = `${resize.width} × ${resize.height}`;

  return (
    <main>
      <h1>크기 조정</h1>
      <p>{ratioLabel}</p>
      <Slider value={resize.scale} min={resize.minScale} max={resize.maxScale} onChange={resize.setScale} />
      <button type="button" onClick={() => setPresetListOpen(!isPresetListOpen)}>
        프리셋 {isPresetListOpen ? '닫기' : '열기'}
      </button>
      {isPresetListOpen && (
        <PresetList presets={resize.presets} selectedId={resize.presetId} onSelect={resize.selectPreset} />
      )}
      <CreditBadge cost={resize.cost} isShort={!resize.hasEnoughCredit} />
      <Button disabled={!resize.canSubmit} onClick={resize.submit}>
        {resize.isSubmitting ? '조정 중' : '적용'}
      </Button>
      {resize.error && <p role="alert">{resize.error.message}</p>}
    </main>
  );
}

type PresetListProps = {
  presets: ResizePreset[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function PresetList({ presets, selectedId, onSelect }: PresetListProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <ul>
      {presets.map((preset) => (
        <li
          key={preset.id}
          aria-selected={preset.id === selectedId}
          onMouseEnter={() => setHoveredId(preset.id)}
          onMouseLeave={() => setHoveredId(null)}
          onClick={() => onSelect(preset.id)}
        >
          {preset.label}
          {hoveredId === preset.id && <Tooltip>{`${preset.width} × ${preset.height}`}</Tooltip>}
        </li>
      ))}
    </ul>
  );
}

function CreditBadge({ cost, isShort }: { cost: number; isShort: boolean }) {
  const balance = useCreditStore((state) => state.balance);

  return (
    <span className={isShort ? 'text-red-500' : undefined}>
      {cost.toLocaleString()} 크레딧 · 보유 {balance.toLocaleString()}
    </span>
  );
}
