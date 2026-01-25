import { useEffect, useState, useRef } from 'react';
import { getTutorialStep, getTotalSteps, isFirstStep, isLastStep } from './tutorialSteps';
import styles from './TutorialTooltip.module.css';

interface TutorialTooltipProps {
  step: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

interface Position {
  top: number;
  left: number;
  arrowPosition: 'top' | 'bottom' | 'left' | 'right';
}

export function TutorialTooltip({
  step,
  onNext,
  onPrev,
  onSkip,
}: TutorialTooltipProps) {
  const [position, setPosition] = useState<Position | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const currentStep = getTutorialStep(step);

  useEffect(() => {
    if (!currentStep) return;

    const calculatePosition = () => {
      const targetElement = document.querySelector(currentStep.targetElement);
      const tooltip = tooltipRef.current;

      if (!targetElement || !tooltip) {
        // If element not found, center the tooltip
        setPosition({
          top: window.innerHeight / 2 - 100,
          left: window.innerWidth / 2 - 200,
          arrowPosition: 'top',
        });
        return;
      }

      const targetRect = targetElement.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const padding = 16;

      let top = 0;
      let left = 0;
      let arrowPosition: 'top' | 'bottom' | 'left' | 'right' = currentStep.position;

      switch (currentStep.position) {
        case 'top':
          top = targetRect.top - tooltipRect.height - padding;
          left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
          arrowPosition = 'bottom';
          break;
        case 'bottom':
          top = targetRect.bottom + padding;
          left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
          arrowPosition = 'top';
          break;
        case 'left':
          top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
          left = targetRect.left - tooltipRect.width - padding;
          arrowPosition = 'right';
          break;
        case 'right':
          top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
          left = targetRect.right + padding;
          arrowPosition = 'left';
          break;
      }

      // Keep tooltip within viewport
      const viewportPadding = 20;
      top = Math.max(viewportPadding, Math.min(top, window.innerHeight - tooltipRect.height - viewportPadding));
      left = Math.max(viewportPadding, Math.min(left, window.innerWidth - tooltipRect.width - viewportPadding));

      setPosition({ top, left, arrowPosition });
    };

    // Calculate position after a short delay to ensure DOM is ready
    const timer = setTimeout(calculatePosition, 100);

    // Recalculate on resize
    window.addEventListener('resize', calculatePosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculatePosition);
    };
  }, [step, currentStep]);

  if (!currentStep) return null;

  const totalSteps = getTotalSteps();
  const first = isFirstStep(step);
  const last = isLastStep(step);

  return (
    <div
      ref={tooltipRef}
      className={`${styles.tooltip} ${position ? styles.visible : ''}`}
      style={position ? { top: position.top, left: position.left } : undefined}
    >
      <div className={`${styles.arrow} ${styles[position?.arrowPosition || 'top']}`} />

      <div className={styles.header}>
        <span className={styles.stepCounter}>
          Step {step} of {totalSteps}
        </span>
        <button className={styles.skipButton} onClick={onSkip}>
          Skip
        </button>
      </div>

      <h3 className={styles.title}>{currentStep.title}</h3>
      <p className={styles.description}>{currentStep.description}</p>

      <div className={styles.actions}>
        {!first && (
          <button className={styles.prevButton} onClick={onPrev}>
            Previous
          </button>
        )}
        <button className={styles.nextButton} onClick={onNext}>
          {last ? 'Finish' : 'Next'}
        </button>
      </div>

      <div className={styles.progress}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`${styles.dot} ${i + 1 <= step ? styles.active : ''}`}
          />
        ))}
      </div>
    </div>
  );
}
