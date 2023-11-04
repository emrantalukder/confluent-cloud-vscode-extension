import * as React from 'react';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { vscode } from "./utilities/vscode";
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';

const App = () => {
  
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.command) {
        case 'showResource':
          console.log(message);
          break;
        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);
  }, []);

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
    <VSCodeButton onClick={handleClick}>Show Resource</VSCodeButton>
  </main>;
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);