import { useState, useEffect } from 'react';
import './ThinkingIndicator.css';

// Fun words like Claude Code uses
const thinkingWords = [
  'Pondering',
  'Contemplating',
  'Reasoning',
  'Analyzing',
  'Considering',
  'Exploring',
  'Synthesizing',
  'Processing',
  'Evaluating',
  'Thinking',
  'Reflecting',
  'Examining',
  'Investigating',
  'Deliberating',
  'Musing',
];

interface ThinkingIndicatorProps {
  className?: string;
}

export function ThinkingIndicator({ className = '' }: ThinkingIndicatorProps) {
  const [wordIndex, setWordIndex] = useState(0);
  const [dots, setDots] = useState('');

  // Rotate words every 2 seconds
  useEffect(() => {
    const wordInterval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % thinkingWords.length);
    }, 2000);

    return () => clearInterval(wordInterval);
  }, []);

  // Animate dots
  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots((prev) => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 400);

    return () => clearInterval(dotInterval);
  }, []);

  return (
    <div className={`thinking-indicator ${className}`}>
      <div className="thinking-spinner">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      <span className="thinking-word">{thinkingWords[wordIndex]}</span>
      <span className="thinking-dots">{dots}</span>
    </div>
  );
}
