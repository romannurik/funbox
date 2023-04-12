import ohm, { extras as ohmExtras } from 'ohm-js';

const GRAMMAR = `
KidLang {
  Program = newline* Statement*
  Statement
    = (BlockStatement | SingleLineStatement) (comment | eol) -- withComment
    | comment  -- justComment

  End = caseInsensitive<"END">
  BlockStatement = RepeatStatement | IfStatement | FunctionStatement
  RepeatStatement = caseInsensitive<"REPEAT"> Expr newline Statement* End
  IfStatement = caseInsensitive<"IF"> Expr newline Statement*
    ElseIfStatement*
    ElseStatement?
    End
  ElseIfStatement = caseInsensitive<"ELSE"> caseInsensitive<"IF"> Expr newline Statement*
  ElseStatement = caseInsensitive<"ELSE"> newline Statement*
  FunctionStatement = caseInsensitive<"FUNCTION"> ident ident* newline Statement* End

  SingleLineStatement = SetStatement | CallStatement | CommandStatement
  SetStatement = caseInsensitive<"SET"> ident "=" Expr
  CallStatement = caseInsensitive<"CALL"> ident Expr*
  CommandStatement = command Arg*
  
  Arg = Expr
  Expr
    = Expr "+" MulExpr  -- plus
    | Expr "-" MulExpr  -- minus
    | MulExpr
  MulExpr
    = MulExpr "*" BoolExpr  -- mult
    | MulExpr "/" BoolExpr  -- div
    | BoolExpr
  BoolExpr
    = BoolExpr caseInsensitive<"AND"> PrimExpr  -- and
    | BoolExpr caseInsensitive<"OR"> PrimExpr  -- or
    | PrimExpr
  PrimExpr
    = "(" Expr ")"  -- paren
    | PrimExpr "=" PrimExpr  -- equals
    | "+" PrimExpr  -- positive
    | "-" PrimExpr  -- negative
    | caseInsensitive<"NOT"> PrimExpr  -- not
    | CallExpr | Vector | Boolean | number | string | varName
  CallExpr = "(" caseInsensitive<"CALL"> ident Expr* ")"
  Boolean (true or false) = caseInsensitive<"TRUE"> | caseInsensitive<"FALSE">
  Vector = number (caseInsensitive<"ROWS"> | caseInsensitive<"ROW"> | caseInsensitive<"COLUMNS"> | caseInsensitive<"COLUMN">)
  
  space := (" " | "\\t")
  newline = "\\n" ("\\n" | space)*
  eol = (newline | end)
  reservedWord
    = caseInsensitive<"SET">
      | caseInsensitive<"REPEAT">
      | caseInsensitive<"IF">
      | caseInsensitive<"ELSE">
      | caseInsensitive<"FUNCTION">
      | caseInsensitive<"END">
      | caseInsensitive<"CALL">
      | caseInsensitive<"AND">
      | caseInsensitive<"OR">
      | caseInsensitive<"NOT">
      | caseInsensitive<"TRUE">
      | caseInsensitive<"FALSE">
  comment (a comment) = "#" (~"\\n" any)* eol
  command = ~reservedWord letter+
  varName (a variable) = ident
  ident (an identifier) = letter (letter | digit)*
  string (a string) = "\\"" (~"\\"" any)* "\\""
  number (a number) = digit+
}
`;

const ZERO_VECTOR = vector(0, 0);
const IDENTITY_VECTOR = vector(1, 1);

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
  PrimExpr_not: mappingWithNodes({ type: "unaryOp", expr: 1, op: "not" }),
  Vector: mappingWithNodes({ val: 0, rowOrCol: 1 }),
  comment(_, __, ___) { return null; },
  varName(ident) { return { type: 'varName', varName: ident.sourceString, varNameNode: ident } },
  Boolean(s) { return s.sourceString.toLocaleLowerCase() === "true"; },
  number(_) { return parseInt(this.sourceString); },
  string(_, __, ___) { return JSON.parse(this.sourceString); },
};

const AST_ACTIONS = {
  async SetStatement(context, { varName, expr }) {
    context.vars[varName] = await evalNode(context, expr);
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
  async FunctionStatement(context, { funcName, args, body }) {
    context.funcs[funcName] = {
      argNames: args,
      body,
    };
  },
  async CallStatement(context, { funcName, args, funcNameNode }) {
    if (funcName in context.funcs) {
      let { argNames, body } = context.funcs[funcName];
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
        vars: {
          ...context.vars,
          ...params,
        }
      };

      return await evalNode(callContext, body);

    } else if (funcName in context.builtins) {
      let params = [];
      for (let i = 0; i < args.length; i++) {
        params.push(await evalNode(context, args[i]));
      }

      return await context.builtins[funcName](...params);
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
    context.stdout += pieces.join(', ') + '\n';
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
    if (!(varName in context.vars)) {
      throw {
        position: varNameNode.source.startIdx,
        endPosition: varNameNode.source.endIdx,
        message: `Unknown variable "${varName}"`,
      };
    }
    return context.vars[varName];
  },
};

const parser = ohm.grammar(GRAMMAR);

async function run(program, globals, onCommand) {
  const matchResult = parser.match(program);
  if (matchResult.failed()) {
    throw {
      position: matchResult.getRightmostFailurePosition(),
      message: matchResult.shortMessage,
    };
  }
  const context = {
    stdout: '',
    vars: globals?.vars || {},
    funcs: {},
    builtins: globals?.funcs || {},
    onCommand
  };
  const ast = ohmExtras.toAST(matchResult, AST_MAPPING);
  await evalNode(context, ast);
  // sem(matchResult).eval(context);
  return context.stdout;
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

export default { run };