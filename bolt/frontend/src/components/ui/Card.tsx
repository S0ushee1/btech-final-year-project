import type { PropsWithChildren } from 'react';

interface CardProps {
  className?: string;
}

export function Card({ className = '', children }: PropsWithChildren<CardProps>) {
  return <section className={`section-card ${className}`.trim()}>{children}</section>;
}
