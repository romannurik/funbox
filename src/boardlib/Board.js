import React from "react";
import { Piece } from "./Piece";
import cn from "classnames";

let Context = React.createContext({});

const initialState = {
  receivers: {},
  pieces: {},
  draggingPiece: null,
  dragInfo: {}
};

function normalizeStore(store) {
  let { pieces, receivers } = store;

  // put pieces not in a receiver into a matching autoFill receiver
  let unallocatedPieces = { ...pieces };
  let autoFillReceivers = [];
  for (let receiver of Object.values(receivers)) {
    if (receiver.props.autoFill) {
      autoFillReceivers = [...autoFillReceivers, receiver];
    }
    for (let value of receiver.pieces) {
      delete unallocatedPieces[value];
    }
  }

  for (let [value, piece] of Object.entries(unallocatedPieces)) {
    for (let receiver of autoFillReceivers) {
      if (receiver.props.accept == piece.props.type) {
        receiver.pieces.push(value);
      }
    }
  }

  return store;
}

const actions = {
  registerReceiver: (store, { id, props, ref }) =>
    normalizeStore({
      ...store,
      receivers: {
        ...store.receivers,
        [id]: {
          props: props,
          ref: ref,
          pieces: []
        }
      }
    }),
  unregisterReceiver: (store, { id }) => {
    let { [id]: _, ...receivers } = store.receivers;
    return normalizeStore({
      ...store,
      receivers
    });
  },
  registerPiece: (store, { value, props }) => {
    if (store.pieces[value]) {
      throw new Error(`Already registered piece: ${value}`);
    }

    return normalizeStore({
      ...store,
      pieces: {
        ...store.pieces,
        [value]: {
          props
        }
      }
    });
  },
  unregisterPieces: store => normalizeStore({ ...store, pieces: {} }),
  dragPiece(store, { fromReceiver, pieceValue, el, clientX, clientY }) {
    let receiverRects = {};
    for (let [id, receiver] of Object.entries(store.receivers)) {
      let { ref } = receiver;
      receiverRects[id] = ref.current.getBoundingClientRect();
    }
    let r = el.getBoundingClientRect();
    return {
      ...store,
      draggingPiece: pieceValue,
      dragInfo: {
        fromReceiver,
        toReceiver: null,
        x: clientX,
        y: clientY,
        xOffs: clientX - r.x,
        yOffs: clientY - r.y,
        width: el.offsetWidth,
        height: el.offsetHeight,
        receiverRects
      }
    };
  },
  dragMove(store, { clientX, clientY }) {
    if (!store.draggingPiece) {
      return store;
    }
    let toReceiver = null;
    for (let [id, rect] of Object.entries(store.dragInfo.receiverRects || {})) {
      if (
        clientX >= rect.x &&
        clientY >= rect.y &&
        clientX <= rect.right &&
        clientY <= rect.bottom
      ) {
        let pieceProps = store.pieces[store.draggingPiece].props;
        let { accept, canReceive } = store.receivers[id].props;
        if (canReceive) {
          if (canReceive(pieceProps, store.receivers[id].pieces)) {
            toReceiver = id;
          }
        } else if (pieceProps.type === accept) {
          toReceiver = id;
        }
      }
    }
    return {
      ...store,
      dragInfo: {
        ...store.dragInfo,
        x: clientX,
        y: clientY,
        toReceiver
      }
    };
  },
  drop(store) {
    let { fromReceiver, toReceiver } = store.dragInfo;
    if (toReceiver && fromReceiver && fromReceiver !== toReceiver) {
      store = { ...store };
      store.receivers = { ...store.receivers };
      let { onSend } = store.receivers[fromReceiver].props;
      if (onSend) {
        store.receivers[fromReceiver].pieces = onSend(
          store.draggingPiece,
          store.receivers[fromReceiver].pieces
        );
      } else {
        store.receivers[fromReceiver].pieces = store.receivers[
          fromReceiver
        ].pieces.filter(v => store.draggingPiece !== v);
      }
      let { onReceive } = store.receivers[toReceiver].props;
      if (onReceive) {
        store.receivers[toReceiver].pieces = onReceive(
          store.draggingPiece,
          store.receivers[toReceiver].pieces
        );
      } else {
        store.receivers[toReceiver].pieces.push(store.draggingPiece);
      }
    }
    return normalizeStore({
      ...store,
      draggingPiece: null,
      dragInfo: {}
    });
  }
};

function reducer(store, { type, ...args }) {
  return type in actions ? actions[type](store, args) : store;
}

export function Board({ onChange, className, children }) {
  let [store, dispatchRaw] = React.useReducer(reducer, initialState);

  let dispatch = new Proxy(dispatchRaw, {
    get: (target, prop) => {
      if (prop in actions) {
        return ({ ...args } = {}) => target({ type: prop, ...args });
      }
      return target[prop];
    }
  });

  React.useEffect(() => {
    let boardState = {};
    for (let [id, receiver] of Object.entries(store.receivers)) {
      if (!receiver.props.id) {
        continue;
      }
      boardState[id] = receiver.pieces;
      if (boardState[id].length == 0) {
        boardState[id] = null;
      } else if (boardState[id].length == 1) {
        boardState[id] = receiver.pieces[0];
      }
    }
    onChange && onChange(boardState);
  }, [store.receivers]);

  React.useEffect(() => {
    let move_ = event => {
      dispatch.dragMove({
        clientX: event.clientX,
        clientY: event.clientY
      });
    };

    let up_ = event => {
      dispatch.drop({ event });
    };

    window.addEventListener("pointermove", move_);
    window.addEventListener("pointerup", up_);

    return () => {
      window.removeEventListener("pointermove", move_);
      window.removeEventListener("pointerup", up_);
    };
  }, []);

  return (
    <Context.Provider value={[store, dispatch]}>
      <div
        className={cn(className, "Board", {
          isDragging: !!store.draggingPiece
        })}
      >
        {children}
        {store.draggingPiece && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              cursor: "-webkit-grabbing"
            }}
          >
            <div
              style={{
                position: "absolute",
                pointerEvents: "none",
                left: store.dragInfo.x - store.dragInfo.xOffs + window.scrollX,
                top: store.dragInfo.y - store.dragInfo.yOffs + window.scrollY,
                width: store.dragInfo.width,
                height: store.dragInfo.height
              }}
            >
              <Piece dragImage {...store.pieces[store.draggingPiece].props} />
            </div>
          </div>
        )}
      </div>
    </Context.Provider>
  );
}

function Pieces({ children }) {
  let [store, dispatch] = React.useContext(Context);

  React.useEffect(() => {
    React.Children.forEach(children, ({ props }) => {
      dispatch.registerPiece({
        value: String(props.value),
        props
      });
    });

    return () => dispatch.unregisterPieces();
  }, [children]);

  return <div style={{ display: "none" }}>{children}</div>;
}

Board.Context = Context;
Board.Pieces = Pieces;
