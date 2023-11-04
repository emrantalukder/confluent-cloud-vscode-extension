import * as vscode from 'vscode';
import { extensionUri, getNonce } from './helpers';

export var openWebViews: Map<string, ResourceViewPanel> = new Map();

export class ResourceViewPanel {
    public panel: vscode.WebviewPanel;
	private _disposables: vscode.Disposable[] = [];
    public item: any;

    private constructor(panel: vscode.WebviewPanel, item: any) {
        this.panel = panel;
        this.item = item;
        const reactAppOnDisk = vscode.Uri.joinPath(extensionUri(), 'dist', 'webview', 'bundle.js');
		const reactAppUri = this.panel.webview.asWebviewUri(reactAppOnDisk);
		this.panel.webview.html = this._getWebviewContent(reactAppUri);
		this._setWebviewListener(this.panel.webview);

        this.panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public static render(item: any): ResourceViewPanel {
        const panel = vscode.window.createWebviewPanel(
            "confluentCloudResource", 
            "Confluent Cloud Resource", 
            vscode.ViewColumn.One, 
            {
                enableScripts: true,
                retainContextWhenHidden: true // resource intensive
            });

        panel.iconPath = {
            dark: vscode.Uri.joinPath(extensionUri(), 'resources', 'dark', `${item.kind}.svg`),
            light: vscode.Uri.joinPath(extensionUri(), 'resources', 'light', `${item.kind}.svg`),
        };

        panel.title = `${item.label} (${item.resource.id})`;

        return new ResourceViewPanel(panel, item);
    }

    private _setWebviewListener(webview: vscode.Webview) {
		webview.onDidReceiveMessage((message) => {
			const command = message.command;
			const text = message.text;

			console.log(command, this.item);
            let itemInfo = `${this.item.kind}: ${this.item.label} (${this.item.resource.id})`;
			switch (command) {
				case "alert":
					vscode.window.showInformationMessage(itemInfo);
					return;
			}
		}, undefined, this._disposables);
	}

    private _getWebviewContent(scriptUri: vscode.Uri): string {
		const webview = this.panel.webview;
		const nonce = getNonce();
		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
				<title>React Webview</title>
			</head>
			<body>
				<div id="root"></div>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}

    public dispose() {
        this.panel.dispose();
        openWebViews.delete(this.item.resource.id);
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
}