import React from "react";
import { Board } from "./Board";
import { Piece } from "./Piece";
import cn from "classnames";

let Context = React.createContext({});

export function PieceReceiver(props) {
  let { className, children } = props;
  const [store, dispatch] = React.useContext(Board.Context);
  let [id, setId] = React.useState(props.id);
  let ref = React.useRef();

  React.useEffect(() => {
    if (!id) {
      id = String(Math.floor(Math.random() * 10000));
      setId(id);
    }

    dispatch.registerReceiver({ id, ref, props });
    return () => dispatch.unregisterReceiver({ id });
  }, []);

  return (
    <Context.Provider value={{ id }}>
      <div
        ref={ref}
        className={cn(className, {
          draggingOver:
            !!store.draggingPiece &&
            store.dragInfo.toReceiver == id &&
            store.dragInfo.fromReceiver != id
        })}
      >
        {children}
        {store.receivers[id]?.pieces.map(value => (
          <Piece
            key={value}
            {...store.pieces[value]?.props}
            dragging={
              store.draggingPiece == value && store.dragInfo?.fromReceiver == id
            }
          />
        ))}
      </div>
    </Context.Provider>
  );
}

PieceReceiver.Context = Context;
