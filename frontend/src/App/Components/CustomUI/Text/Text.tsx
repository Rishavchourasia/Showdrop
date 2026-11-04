import type { ElementType, ReactNode } from 'react';
import { cx } from '../../../Utils/cx';
import styles from './Text.module.scss';

/*
 * ALL typography goes through <Text>. The variant sets size/weight/font (display
 * variants use the Unbounded display face), the tone sets colour. Change the
 * scale in tokens.scss and every heading in the app follows.
 */
export type TextVariant =
  'hero' | 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodyStrong' | 'small' | 'caption' | 'overline' | 'mono';
export type TextTone = 'default' | 'secondary' | 'muted' | 'accent' | 'highlight' | 'success' | 'danger' | 'gradient';

const DEFAULT_ELEMENT: Record<TextVariant, ElementType> = {
  hero: 'h1',
  display: 'p',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  body: 'p',
  bodyStrong: 'p',
  small: 'p',
  caption: 'span',
  overline: 'span',
  mono: 'span',
};

interface TextProps {
  variant?: TextVariant;
  tone?: TextTone;

  as?: ElementType;
  align?: 'start' | 'center' | 'end';

  tabular?: boolean;
  className?: string;
  children: ReactNode;
  id?: string;
}

export function Text({ variant = 'body', tone = 'default', as, align, tabular, className, children, id }: TextProps) {
  const Element = as ?? DEFAULT_ELEMENT[variant];
  return (
    <Element
      id={id}
      className={cx(
        styles[variant],
        styles[`tone-${tone}`],
        align && styles[`align-${align}`],
        tabular && 'tabular',
        className,
      )}
    >
      {children}
    </Element>
  );
}
