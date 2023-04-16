import React from "react";
import { Helmet } from "react-helmet";
import { KidLangEditor } from "./KidLangEditor";

export function KidTutorial() {

  return <>
    <Helmet>
      <title>Kid Programming Tutorial</title>
    </Helmet>
    <h1>Intro to programming</h1>
    <p>A long time ago blah blah</p>
    <KidLangEditor tutorialMode code={`dot red a1`} />
    <p>Hello hello more stuff</p>
    <p>Then there were if statements</p>
    <KidLangEditor tutorialMode code={`set foo = true\nif foo\n  dot red a1\nend`} />
  </>;
}