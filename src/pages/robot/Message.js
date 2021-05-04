import React from "react";
import styles from "./Message.module.scss";
import { XIcon } from "@primer/octicons-react";

export function Message({ show, onClose, children }) {
  if (!show) {
    return null;
  }

  return (
    <div className={styles.messageContainer}>
      <div className={styles.message}>
        <button className={styles.dismiss} onClick={onClose}>
          <XIcon size="36" />
        </button>
        <div className={styles.messageContent}>{children}</div>
      </div>
    </div>
  );
}
