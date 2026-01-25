import { useEffect, useState } from 'react';
import { getTutorialStep } from './tutorialSteps';
import styles from './TutorialHighlight.module.css';

interface TutorialHighlightProps {
  step: number;
}

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TutorialHighlight({ step }: TutorialHighlightProps) {
  const [rect, setRect] = useState<HighlightRect | null>(null);
  const currentStep = getTutorialStep(step);

  useEffect(() => {
    if (!currentStep) {
      setRect(null);
      return;
    }

    const calculateRect = () => {
      const targetElement = document.querySelector(currentStep.targetElement);

      if (!targetElement) {
        setRect(null);
        return;
      }

      const targetRect = targetElement.getBoundingClientRect();
      const padding = currentStep.highlightPadding || 8;

      setRect({
        top: targetRect.top - padding,
        left: targetRect.left - padding,
        width: targetRect.width + padding * 2,
        height: targetRect.height + padding * 2,
      });
    };

    // Calculate position after a short delay
    const timer = setTimeout(calculateRect, 50);

    // Recalculate on resize and scroll
    window.addEventListener('resize', calculateRect);
    window.addEventListener('scroll', calculateRect, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculateRect);
      window.removeEventListener('scroll', calculateRect, true);
    };
  }, [step, currentStep]);

  if (!currentStep || !rect) {
    return (
      <div className={styles.backdrop}>
        <div className={styles.fullOverlay} />
      </div>
    );
  }

  return (
    <div className={styles.backdrop}>
      {/* Top overlay */}
      <div
        className={styles.overlay}
        style={{
          top: 0,
          left: 0,
          right: 0,
          height: rect.top,
        }}
      />
      {/* Bottom overlay */}
      <div
        className={styles.overlay}
        style={{
          top: rect.top + rect.height,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      {/* Left overlay */}
      <div
        className={styles.overlay}
        style={{
          top: rect.top,
          left: 0,
          width: rect.left,
          height: rect.height,
        }}
      />
      {/* Right overlay */}
      <div
        className={styles.overlay}
        style={{
          top: rect.top,
          left: rect.left + rect.width,
          right: 0,
          height: rect.height,
        }}
      />
      {/* Highlight border */}
      <div
        className={styles.highlight}
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        }}
      />
    </div>
  );
}
