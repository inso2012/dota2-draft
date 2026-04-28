'use client';

import { DraftStep, GameMode } from '@/lib/types';
import { Language } from '@/lib/i18n';
import { CAPTAINS_MODE_SEQUENCE, ALL_PICK_SEQUENCE } from '@/lib/draftEngine';
import clsx from 'clsx';

interface PhaseIndicatorProps {
  currentStep: number;
  sequence: DraftStep[];
  mode: GameMode;
  isComplete: boolean;
  lang: Language;
  onUndo: () => void;
  onReset: () => void;
}

export default function PhaseIndicator({
  currentStep,
  sequence,
  mode,
  isComplete,
  lang,
  onUndo,
  onReset,
}: PhaseIndicatorProps) {
  const currentStepData = sequence[currentStep];
  const progress = sequence.length > 0 ? (currentStep / sequence.length) * 100 : 0;

  const stepLabel = currentStepData
    ? lang === 'zh'
      ? `${currentStepData.team === 'radiant' ? '天辉' : '夜魇'} ${currentStepData.action === 'ban' ? '禁用' : '选取'}`
      : `${currentStepData.team === 'radiant' ? 'Radiant' : 'Dire'} ${currentStepData.action === 'ban' ? 'BAN' : 'PICK'}`
    : '';

  const phaseNum = currentStepData?.phase ?? 0;

  return (
    <div className="bg-game-panel/90 border border-game-border rounded-lg p-3 flex flex-col gap-2">
      {/* Top row: phase info + controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <span className="text-game-gold font-bold text-sm">
              {lang === 'zh' ? '✓ 选人完成' : '✓ Draft Complete'}
            </span>
          ) : (
            <>
              <span
                className={clsx(
                  'inline-block px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider',
                  currentStepData?.action === 'ban'
                    ? 'bg-red-900/50 text-red-300 border border-red-800'
                    : 'bg-blue-900/50 text-blue-300 border border-blue-800',
                )}
              >
                {currentStepData?.action === 'ban'
                  ? lang === 'zh' ? '禁用' : 'BAN'
                  : lang === 'zh' ? '选取' : 'PICK'}
              </span>
              <span
                className={clsx(
                  'font-semibold text-sm',
                  currentStepData?.team === 'radiant' ? 'text-radiant-glow' : 'text-dire-glow',
                )}
              >
                {stepLabel}
              </span>
              <span className="text-gray-500 text-xs">
                {lang === 'zh' ? `第${phaseNum}阶段` : `Phase ${phaseNum}`}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onUndo}
            disabled={currentStep === 0}
            className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded border border-gray-700 text-gray-300 transition-colors"
          >
            {lang === 'zh' ? '撤销' : 'Undo'}
          </button>
          <button
            onClick={onReset}
            className="px-2 py-1 text-xs bg-gray-800 hover:bg-red-900/50 rounded border border-gray-700 hover:border-red-800 text-gray-300 hover:text-red-300 transition-colors"
          >
            {lang === 'zh' ? '重置' : 'Reset'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-game-gold to-game-gold-light rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step counter */}
      <div className="flex items-center justify-between text-[10px] text-gray-500">
        <span>
          {lang === 'zh' ? `步骤 ${currentStep}/${sequence.length}` : `Step ${currentStep}/${sequence.length}`}
        </span>
        <span className="uppercase tracking-wider">
          {mode === 'captains'
            ? lang === 'zh' ? '队长模式' : 'Captains Mode'
            : lang === 'zh' ? '全英雄选择' : 'All Pick'}
        </span>
      </div>
    </div>
  );
}
