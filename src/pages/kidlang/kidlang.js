import ohm, { extras as ohmExtras } from 'ohm-js';
import GRAMMAR from './kidlang-grammar';

const ZERO_VECTOR = vector(0, 0);
const IDENTITY_VECTOR = vector(1, 1);
const PARSER = ohm.grammar(GRAMMAR);

function mappingWithNodes(mapping) {
  let mwn = { ...mapping };
  for (let k in mapping) {
    if (typeof mapping[k] === 'number') {
      mwn[`${k}Node`] = c => c[mapping[k]];
    }
  }
  return mwn;
}

const AST_MAPPING = {
  Program: 1,
  Statement: 0,
  Statement_withComment: 0,
  SetStatement: mappingWithNodes({ varName: 1, expr: 3 }),
  IfStatement: mappingWithNodes({ condition: 1, body: 3, elseIfs: 4, else: 5 }),
  ElseIfStatement: mappingWithNodes({ condition: 2, body: 4 }),
  ElseStatement: mappingWithNodes({ body: 2 }),
  RepeatStatement: mappingWithNodes({ numTimes: 1, body: 3 }),
  TimerStatement: mappingWithNodes({ frequency: 1, body: 3 }),
  FunctionStatement: mappingWithNodes({ funcName: 1, args: 2, body: 4 }),
  CommandStatement: mappingWithNodes({ command: 0, args: 1 }),
  CallStatement: mappingWithNodes({ funcName: 1, args: 2 }),
  CallExpr: mappingWithNodes({ type: 'CallStatement', funcName: 2, args: 3 }),
  Expr_plus: mappingWithNodes({ type: "binaryOp", exprLeft: 0, op: "add", exprRight: 2 }),
  Expr_minus: mappingWithNodes({ type: "binaryOp", exprLeft: 0, op: "subtract", exprRight: 2 }),
  MulExpr_mult: mappingWithNodes({ type: "binaryOp", exprLeft: 0, op: "multiply", exprRight: 2 }),
  MulExpr_div: mappingWithNodes({ type: "binaryOp", exprLeft: 0, op: "divide", exprRight: 2 }),
  BoolExpr_and: mappingWithNodes({ type: "binaryOp", exprLeft: 0, op: "and", exprRight: 2 }),
  BoolExpr_or: mappingWithNodes({ type: "binaryOp", exprLeft: 0, op: "or", exprRight: 2 }),
  PrimExpr_positive: mappingWithNodes({ type: "unaryOp", expr: 1, op: "positive" }),
  PrimExpr_negative: mappingWithNodes({ type: "unaryOp", expr: 1, op: "negative" }),
  PrimExpr_equals: mappingWithNodes({ type: "binaryOp", exprLeft: 0, op: "equals", exprRight: 2 }),
  PrimExpr_gt: mappingWithNodes({ type: "binaryOp", exprLeft: 0, op: "gt", exprRight: 2 }),
  PrimExpr_lt: mappingWithNodes({ type: "binaryOp", exprLeft: 0, op: "lt", exprRight: 2 }),
  PrimExpr_gte: mappingWithNodes({ type: "binaryOp", exprLeft: 0, op: "gte", exprRight: 2 }),
  PrimExpr_lte: mappingWithNodes({ type: "binaryOp", exprLeft: 0, op: "lte", exprRight: 2 }),
  PrimExpr_not: mappingWithNodes({ type: "unaryOp", expr: 1, op: "not" }),
  Vector: mappingWithNodes({ val: 0, rowOrCol: 1 }),
  comment(_, __, ___) { return null; },
  varName(ident) { return { type: 'varName', varName: ident.sourceString, varNameNode: ident } },
  Boolean(s) { return s.sourceString.toLocaleLowerCase() === "true"; },
  number(_, __, ___) { return parseFloat(this.sourceString); },
  string(_, __, ___) { return JSON.parse(this.sourceString); },
};

const AST_ACTIONS = {
  async SetStatement(context, { varName, expr }) {
    context.scope.updateOrSet(varName, await evalNode(context, expr));
  },
  async IfStatement(context, { condition, body, elseIfs, else: theElse }) {
    condition = await evalNode(context, condition);
    if (!!condition) {
      await evalNode(context, body);
      return;
    }

    if (elseIfs.length) {
      for (let { condition, body } of elseIfs) {
        condition = await evalNode(context, condition);
        if (!!condition) {
          await evalNode(context, body);
          return;
        }
      }
    }

    if (theElse) {
      await evalNode(context, theElse.body);
    }
  },
  async RepeatStatement(context, { numTimes, body }) {
    numTimes = await evalNode(context, numTimes);
    for (let i = 0; i < numTimes; i++) {
      await evalNode(context, body);
    }
  },
  async TimerStatement(context, { frequency, body }) {
    frequency = await evalNode(context, frequency);
    let handle = window.setInterval(() => {
      evalNode(context, body).catch(context.onError);
    }, Math.max(frequency * 1000, 100));
    evalNode(context, body); // initial
    context.stoppers.push(() => {
      window.clearInterval(handle);
    });
  },
  async FunctionStatement(context, { funcName, args, body }) {
    context.scope.set(funcName, {
      argNames: args,
      body,
    });
  },
  async CallStatement(context, { funcName, args, funcNameNode }) {
    let fn = context.scope.get(funcName);
    if (fn) {
      // TODO: validate data type (that it's a function)
      let { argNames, body } = fn;
      if (argNames.length !== args.length) {
        throw {
          position: funcNameNode.source.startIdx,
          endPosition: funcNameNode.source.endIdx,
          message: `Function "${funcName}" expects ${argNames.length} parameters (got ${args.length})`,
        };
      }

      let params = {};
      for (let i = 0; i < argNames.length; i++) {
        params[argNames[i]] = await evalNode(context, args[i]);
      }

      let callContext = {
        ...context,
        scope: new Scope(params, context.scope)
      };

      return await evalNode(callContext, body);

    }

    throw {
      position: funcNameNode.source.startIdx,
      endPosition: funcNameNode.source.endIdx,
      message: `Unknown function "${funcName}"`,
    };
  },
  async CommandStatement(context, { command, commandNode, args, argsNode }) {
    let argValues = [];
    for (let arg of args) {
      argValues.push(await evalNode(context, arg));
    }
    let pieces = [
      command,
      ...argValues,
    ];
    try {
      await context.onCommand(command.toLocaleUpperCase(), ...pieces.slice(1));
    } catch (e) {
      throw {
        position: commandNode.source.startIdx,
        endPosition: argsNode.source.endIdx,
        message: e.message,
      };
    }
  },
  async binaryOp(context, { exprLeft, exprLeftNode, op, exprRight, exprRightNode }) {
    const left = await evalNode(context, exprLeft);
    const right = await evalNode(context, exprRight);
    if ((left.type === 'vector' || right.type === 'vector') && !(op in ZERO_VECTOR)) {
      throw {
        position: exprLeftNode.source.startIdx,
        endPosition: exprRightNode.source.endIdx,
        message: "Unknown operation on vectors",
      };
    }
    if (left.type === 'vector') {
      return left[op](right);
    } else if (right.type === 'vector') {
      return right[op](left);
    }
    if (op === 'add') return left + right;
    if (op === 'subtract') return left - right;
    if (op === 'multiply') return left * right;
    if (op === 'divide') return left / right;
    if (op === 'and') return left && right;
    if (op === 'or') return left || right;
    if (op === 'equals') return left == right;
    if (op === 'gt') return left > right;
    if (op === 'lt') return left < right;
    if (op === 'gte') return left >= right;
    if (op === 'lte') return left <= right;
  },
  async unaryOp(context, { expr, exprNode, op }) {
    const val = await evalNode(context, expr);
    if (val.type === 'vector') {
      if (op in val) {
        return val[op];
      } else {
        throw {
          position: exprNode.source.startIdx,
          endPosition: exprNode.source.endIdx,
          message: "Unknown operation on vector",
        };
      }
    }
    if (op === 'positive') return +val;
    if (op === 'negative') return -val;
    if (op === 'not') return !val;
  },
  async Vector(context, { val, rowOrCol }) {
    rowOrCol = rowOrCol.toLocaleUpperCase();
    let isRow = rowOrCol === 'ROW' || rowOrCol === 'ROWS';
    return vector(isRow ? val : 0, isRow ? 0 : val);
  },
  async varName(context, { varName, varNameNode }) {
    if (!context.scope.has(varName)) {
      throw {
        position: varNameNode.source.startIdx,
        endPosition: varNameNode.source.endIdx,
        message: `Unknown variable "${varName}"`,
      };
    }
    return context.scope.get(varName);
  },
};

export function vector(r, c) {
  console.assert(typeof r === 'number', `Row is not a number, got ${r}`);
  console.assert(typeof c === 'number', `Column is not a number, got ${c}`);
  return {
    type: 'vector',
    r,
    c,
    add(v) {
      return v.type === 'vector'
        ? vector(this.r + v.r, this.c + v.c)
        : vector(this.r + v, this.c + c);
    },
    subtract(v) {
      return v.type === 'vector'
        ? vector(this.r - v.r, this.c - v.c)
        : vector(this.r - v, this.c - c);
    },
    multiply(v) {
      return v.type === 'vector'
        ? vector(this.r * v.r, this.c * v.c)
        : vector(this.r * v, this.c * c);
    },
    divide(v) {
      return v.type === 'vector'
        ? vector(this.r / v.r, this.c / v.c)
        : vector(this.r / v, this.c / c);
    },
    negative() {
      return vector(-this.r, -this.c);
    },
    toString() { return `{${this.c};${this.r}}` }
  };
}

async function evalNode(context, node) {
  // _iter
  if (Array.isArray(node)) {
    let results = [];
    for (let child of node) {
      results.push(await evalNode(context, child));
    }
    return results;
  }

  // _terminal
  if (node == null || node.type == null) {
    return node;
  }

  // _nonterminal
  let astAction = AST_ACTIONS[node.type];
  if (astAction) {
    return await astAction(context, node);
  }

  throw new Error(`No action to interpret node of type "${node.type}"`);
}

/**
 * Converts a program to an abstract syntax tree, or throws
 * if there was an error
 */
function programToAST(program) {
  const matchResult = PARSER.match(program);
  if (matchResult.failed()) {
    throw {
      position: matchResult.getRightmostFailurePosition(),
      message: matchResult.shortMessage,
    };
  }
  return ohmExtras.toAST(matchResult, AST_MAPPING);
}

/**
 * Starts a program, with support for events and timers; can be stopped
 * at any time
 */
export function start(program, {
  globals,
  onCommand,
  onError,
}) {
  const context = {
    scope: new Scope(globals),
    stopped: false,
    stoppers: [],
    onError,
    onCommand
  };

  try {
    const ast = programToAST(program);
    evalNode(context, ast).catch(onError);
  } catch (e) {
    onError(e);
  }

  return {
    stop() {
      context.stopped = true;
      context.stoppers.forEach(s => s());
    },
    async fireEvent(name, ...args) {
      // call the function with the given name
      let fn = context.scope.get(name);
      if (!fn) {
        return;
      }

      let { argNames, body } = fn;
      if (argNames.length !== args.length) {
        throw {
          position: 0,
          endPosition: 0,
          message: `Function "${name}" expects ${argNames.length} parameters (got ${args.length})`,
        };
      }

      let params = {};
      for (let i = 0; i < argNames.length; i++) {
        params[argNames[i]] = args[i];
      }

      let callContext = {
        ...context,
        scope: new Scope(params, context.scope)
      };

      try {
        return await evalNode(callContext, body);
      } catch (e) {
        onError(e);
      }
    },
  };
}

class Scope {
  parent = null;
  items = {};

  constructor(items = {}, parent = null) {
    this.parent = parent;
    this.items = items || {};
  }

  // finds the scope containing the given item, or undefined if it doesn't exist
  getScopeContaining(name) {
    if (name in this.items) {
      return this;
    } else if (this.parent) {
      return this.parent.getScopeContaining(name);
    }
    return undefined;
  }

  // returns true if the current item is defined in this or an ancestor scope
  has(name) {
    if (name in this.items) {
      return true;
    } else if (this.parent) {
      return this.parent.has(name);
    }
    return false;
  }

  // gets the value for the given item in the current scope, or if not defined, ancestor scope,
  // otherwise undefined
  get(name) {
    if (name in this.items) {
      return this.items[name];
    } else if (this.parent) {
      return this.parent.get(name);
    }
    return undefined;
  }

  // if present in parent scopes, updates the value, otherwise defines it in current scope
  updateOrSet(name, val) {
    let scope = this.getScopeContaining(name);
    if (scope) {
      scope.set(name, val);
      return;
    }
    this.set(name, val);
  }

  // forces [re]definition in current scope, even if the name is present in parent scopes
  set(name, val) {
    this.items[name] = val;
  }

  // removes the item from the current scope
  unset(name, val, everywhere = false) {
    delete this.items[name];
    if (everywhere) {
      this.parent.unset(name, val, true);
    }
  }
}