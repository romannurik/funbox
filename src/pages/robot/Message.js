import cn from 'classnames';
import React from "react";
import styles from "./Message.module.scss";

export function Message({ className, show, button, children }) {
  if (!show) {
    return null;
  }

  return (
    <div className={cn(styles.message, className)}>
      <div className={styles.messageContent}>{children}</div>
      {button}
    </div>
  );
}
