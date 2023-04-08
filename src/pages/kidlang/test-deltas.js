const BEFORE = `
RECTANGLE red a1 j10
RECTANGLE green a1 j10
RECTANGLE blue a1 j10
`;

const AFTER = `
CIRCLE red a1 j10

RECTANGLE blue a1 x10
`;


export function KidLangEditor() {
  let [code, setCode] = useState(BEFORE);

  setTimeout(() => {
    setCode(AFTER);
  }, 1000);

  return <CodeEditor
    style={{
      width: '100vw',
      height: '100vh',
    }}
    code={code}
  />;
}