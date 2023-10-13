import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { vscode } from "./utilities/vscode";

const App = () => {

  const handleClick = () => {
    console.log('clicked');
    vscode.postMessage({
      command: 'alert',
      text: 'Alert from React'
    });
  };

  return <main>
    <h1>React App</h1>
    <p>React app in a VS Code extension</p>
    <button onClick={handleClick}>Show Resource</button>
  </main>;
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);