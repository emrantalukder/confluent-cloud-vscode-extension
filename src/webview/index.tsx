import * as React from 'react';
import * as ReactDOM from 'react-dom';
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
    <button onClick={handleClick}>Howdy</button>
  </main>;
};

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>, 
  document.getElementById('root')
);