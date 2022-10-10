import ohm, { extras as ohmExtras } from 'ohm-js';

const GRAMMAR = `
  KidLang {
    Program = Statement*
    Statement
      = (BlockStatement | SetStatement | CallStatement | CommandStatement) comment? -- withComment
      | comment  -- justComment
    BlockStatement = RepeatStatement | IfStatement | FunctionStatement
    IfStatement = "IF" Expr Statement* "END"
    RepeatStatement = "REPEAT" Expr Statement* "END"
    FunctionStatement = "FUNCTION" ident ident* Statement* "END"

    SetStatement = "SET" ident "=" Expr
    CallStatement = "CALL" ident Expr*
    CommandStatement = command Arg*
    
    Arg = Expr
    Expr
      = Expr "+" MulExpr  -- plus
      | Expr "-" MulExpr  -- minus
      | MulExpr
    MulExpr
      = MulExpr "*" PrimExpr  -- mult
      | MulExpr "/" PrimExpr  -- div
      | PrimExpr
    PrimExpr = Vector | number | string | varName

    Vector = number ("ROWS" | "ROW" | "COLUMNS" | "COLUMN")
    
    comment = "#" (~"\\n" any)* ("\\n" | end)
    reservedWord = "SET" | "REPEAT" | "END"
    command = ~reservedWord upper+
    varName = ident
    ident = lower (lower | digit)*
    string = "\\"" (~\"\\"\" any)* "\\""
    number = digit+
  }
`;

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
  Statement: 0,
  Statement_withComment: 0,
  SetStatement: mappingWithNodes({ varName: 1, expr: 3 }),
  IfStatement: mappingWithNodes({ condition: 1, body: 2 }),
  RepeatStatement: mappingWithNodes({ numTimes: 1, body: 2 }),
  FunctionStatement: mappingWithNodes({ funcName: 1, args: 2, body: 3 }),
  CommandStatement: mappingWithNodes({ command: 0, args: 1 }),
  CallStatement: mappingWithNodes({ funcName: 1, args: 2 }),
  Expr_plus: mappingWithNodes({ type: "mathOp", exprLeft: 0, op: "add", exprRight: 2 }),
  Expr_minus: mappingWithNodes({ type: "mathOp", exprLeft: 0, op: "subtract", exprRight: 2 }),
  MulExpr_mult: mappingWithNodes({ type: "mathOp", exprLeft: 0, op: "multiply", exprRight: 2 }),
  MulExpr_div: mappingWithNodes({ type: "mathOp", exprLeft: 0, op: "divide", exprRight: 2 }),
  Vector: mappingWithNodes({ val: 0, rowOrCol: 1 }),
  comment(_, __, ___) { return null; },
  varName(ident) { return { type: 'varName', varName: ident.sourceString, varNameNode: ident } },
  number(_) { return parseInt(this.sourceString); },
  string(_, __, ___) { return JSON.parse(this.sourceString); },
};

const AST_ACTIONS = {
  async SetStatement(context, { varName, expr }) {
    context.vars[varName] = evalNode(context, expr);
  },
  async IfStatement(context, { condition, body }) {
    condition = await evalNode(context, condition);
    if (!!condition) {
      await evalNode(context, body);
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
    if (!(funcName in context.funcs)) {
      throw {
        position: funcNameNode.source.startIdx,
        endPosition: funcNameNode.source.endIdx,
        message: `Unknown function "${funcName}"`,
      };
    }

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

    await evalNode(callContext, body);
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
      await context.onCommand(command, ...pieces.slice(1));
    } catch (e) {
      throw {
        position: commandNode.source.startIdx,
        endPosition: commandNode.source.endIdx,
        message: e.message,
      };
    }
  },
  async mathOp(context, { exprLeft, op, exprRight }) {
    const left = await evalNode(context, exprLeft);
    const right = await evalNode(context, exprRight);
    if (left.type === 'vector') {
      return left[op](right);
    } else if (right.type === 'vector') {
      return right[op](left);
    }
    if (op === 'add') return left + right;
    if (op === 'subtract') return left - right;
    if (op === 'multiply') return left * right;
    if (op === 'divide') return left / right;
  },
  async Vector(context, { val, rowOrCol, }) {
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

async function run(program, onCommand) {

  const matchResult = parser.match(program);
  if (matchResult.failed()) {
    throw {
      position: matchResult.getRightmostFailurePosition(),
      message: matchResult.shortMessage,
    };
  }
  const context = {
    stdout: '',
    vars: makeInitialVars(),
    funcs: makeInitialFuncs(),
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

function vector(r, c) {
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
    toString() { return `{${this.c};${this.r}}` }
  };
}

function makeInitialVars() {
  const colors = Object.fromEntries(namedColors().map(x => [x.toLocaleLowerCase(), x]));
  const positions = {};
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      // e.g. a1 = {r:0,c:0}
      positions[String.fromCharCode(97 + c) + (r + 1)] = vector(r, c);
    }
  }
  return { ...colors, ...positions, stopsign: true };
}

function makeInitialFuncs() {
  return {};
}

function namedColors() {
  return ["AliceBlue", "AntiqueWhite", "Aqua", "Aquamarine", "Azure", "Beige", "Bisque", "Black", "BlanchedAlmond", "Blue", "BlueViolet", "Brown", "BurlyWood", "CadetBlue", "Chartreuse", "Chocolate", "Coral", "CornflowerBlue", "Cornsilk", "Crimson", "Cyan", "DarkBlue", "DarkCyan", "DarkGoldenRod", "DarkGray", "DarkGrey", "DarkGreen", "DarkKhaki", "DarkMagenta", "DarkOliveGreen", "DarkOrange", "DarkOrchid", "DarkRed", "DarkSalmon", "DarkSeaGreen", "DarkSlateBlue", "DarkSlateGray", "DarkSlateGrey", "DarkTurquoise", "DarkViolet", "DeepPink", "DeepSkyBlue", "DimGray", "DimGrey", "DodgerBlue", "FireBrick", "FloralWhite", "ForestGreen", "Fuchsia", "Gainsboro", "GhostWhite", "Gold", "GoldenRod", "Gray", "Grey", "Green", "GreenYellow", "HoneyDew", "HotPink", "IndianRed", "Indigo", "Ivory", "Khaki", "Lavender", "LavenderBlush", "LawnGreen", "LemonChiffon", "LightBlue", "LightCoral", "LightCyan", "LightGoldenRodYellow", "LightGray", "LightGrey", "LightGreen", "LightPink", "LightSalmon", "LightSeaGreen", "LightSkyBlue", "LightSlateGray", "LightSlateGrey", "LightSteelBlue", "LightYellow", "Lime", "LimeGreen", "Linen", "Magenta", "Maroon", "MediumAquaMarine", "MediumBlue", "MediumOrchid", "MediumPurple", "MediumSeaGreen", "MediumSlateBlue", "MediumSpringGreen", "MediumTurquoise", "MediumVioletRed", "MidnightBlue", "MintCream", "MistyRose", "Moccasin", "NavajoWhite", "Navy", "OldLace", "Olive", "OliveDrab", "Orange", "OrangeRed", "Orchid", "PaleGoldenRod", "PaleGreen", "PaleTurquoise", "PaleVioletRed", "PapayaWhip", "PeachPuff", "Peru", "Pink", "Plum", "PowderBlue", "Purple", "RebeccaPurple", "Red", "RosyBrown", "RoyalBlue", "SaddleBrown", "Salmon", "SandyBrown", "SeaGreen", "SeaShell", "Sienna", "Silver", "SkyBlue", "SlateBlue", "SlateGray", "SlateGrey", "Snow", "SpringGreen", "SteelBlue", "Tan", "Teal", "Thistle", "Tomato", "Turquoise", "Violet", "Wheat", "White", "WhiteSmoke", "Yellow", "YellowGreen"];
}

export default { run };