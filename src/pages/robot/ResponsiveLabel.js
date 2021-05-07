import React from 'react';
import styles from './ResponsiveLabel.module.scss';
import cn from 'classnames';

export function ResponsiveLabel({ className, children, small }) {
  return <span className={cn(styles.label, className)}>
    <span className={styles.default}>{children}</span>
    {small && <span className={styles.small}>{small}</span>}
  </span>;
}