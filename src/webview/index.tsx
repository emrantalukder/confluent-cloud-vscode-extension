import * as React from 'react';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { vscode } from "./utilities/vscode";
import { VSCodeButton, VSCodePanelTab, VSCodePanelView, VSCodePanels } from '@vscode/webview-ui-toolkit/react';

import data from './../test/data/received_bytes.json';

const ResourceView = () => {

  // add style overrides on mount
  useEffect(() => {
    const panel = document.querySelector('vscode-panels');
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(`
    .activeIndicator { background: var(--panel-tab-active-border); }
    `);
    panel?.shadowRoot?.adoptedStyleSheets.push(sheet);
  });

  return (
    <VSCodePanels>
      <VSCodePanelTab>OVERVIEW</VSCodePanelTab>
      <VSCodePanelTab>SETTINGS</VSCodePanelTab>
      <VSCodePanelTab>TOPICS</VSCodePanelTab>
      <VSCodePanelTab>CONSUMER GROUPS</VSCodePanelTab>
      <VSCodePanelView></VSCodePanelView>
      <VSCodePanelView></VSCodePanelView>
      <VSCodePanelView></VSCodePanelView>
      <VSCodePanelView></VSCodePanelView>
    </VSCodePanels>
  );
};

/**
 * APP
 * @returns Root APP Component
 */
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
    <header className="resource-view-header">
    <h1>React App</h1>
    <p>React app in a VS Code extension</p>
    <VSCodeButton onClick={handleClick}>Show Resource</VSCodeButton>
    </header>
    <ResourceView />
  </main>;
};

const elem = document.getElementById('root') || document.body;
const root = createRoot(elem);
root.render(<App />);