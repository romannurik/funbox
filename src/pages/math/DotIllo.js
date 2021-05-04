import React from 'react';
import styles from './DotIllo.module.scss';
import cn from 'classnames';

export function DotIllo({c = 1, n1, s1, n2, s2, n3, s3}) {
  return <div
      className={styles.dotIllo}
      style={{ gridTemplateColumns: `repeat(${c}, auto)`}}>
    {!!n1 && Array(n1).fill().map((_, i) =>
        <div key={i} className={styles.dot} style={{ color: 'var(--dot-1, #f64)' }} />)}
    {!!s1 && Array(s1).fill().map((_, i) =>
        <div key={i} className={cn(styles.dot, styles.isDimmed)} style={{ color: 'var(--dot-1, #f64)' }} />)}
    {!!n2 && Array(n2).fill().map((_, i) =>
        <div key={i} className={styles.dot} style={{ color: 'var(--dot-2, #4cf)' }} />)}
    {!!s2 && Array(s2).fill().map((_, i) =>
        <div key={i} className={cn(styles.dot, styles.isDimmed)} style={{ color: 'var(--dot-2, #4cf)' }} />)}
    {!!n3 && Array(n3).fill().map((_, i) =>
        <div key={i} className={styles.dot} style={{ color: 'var(--dot-3, #6f4)' }} />)}
    {!!s3 && Array(s3).fill().map((_, i) =>
        <div key={i} className={cn(styles.dot, styles.isDimmed)} style={{ color: 'var(--dot-3, #6f4)' }} />)}
  </div>;
}