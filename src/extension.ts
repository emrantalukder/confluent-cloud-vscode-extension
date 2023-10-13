import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as confluent from './confluent';

let confluentCloudResources: Record<string, any> = {
	'environments': []
};

const isStringEmpty = (value: string) => { return value === undefined || value === null || value === ''; };

function isConfigValid() {
	let apiKey = vscode.workspace.getConfiguration().get('confluentCloud.apiKey') as string;
	let apiSecret = vscode.workspace.getConfiguration().get('confluentCloud.apiSecret') as string;

	if (isStringEmpty(apiKey) || isStringEmpty(apiSecret)) {
		return false;
	} else {
		return true;
	}
}

interface TreeNode {
	label: string;
	collapsibleState: vscode.TreeItemCollapsibleState;
	children?: TreeNode[];
	iconPath?: string;
	kind?: string;
	resource?: Record<string, any>;
}

class ResourceTreeDataProvider implements vscode.TreeDataProvider<TreeNode> {
	private _onDidChangeTreeData: vscode.EventEmitter<TreeNode | undefined | void> = new vscode.EventEmitter<
		TreeNode | undefined | void
	>();

	readonly onDidChangeTreeData: vscode.Event<TreeNode | undefined | void> = this._onDidChangeTreeData.event;

	getTreeItem(element: TreeNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
		const treeItem = new vscode.TreeItem(element.label, element.collapsibleState);

		let icon = 'dependency.svg';

		if (element.kind) {
			switch (element.kind) {
				case "EnvironmentList":
					treeItem.contextValue = 'resourceNode';
					break;
				case "ClusterList":
					icon = `Clusters.svg`;
					break;
				case "SchemaRegistryList":
					icon = `SchemaRegistry.svg`;
					treeItem.contextValue = 'schemaRegistryResource';
					break;
				default:
					treeItem.contextValue = 'confluentCloudResource';
					icon = `${element.kind}.svg`;
			}
		} else {
			treeItem.contextValue = 'resourceNode';
		}

		treeItem.iconPath = {
			light: path.join(__filename, '..', '..', 'resources', 'light', icon),
			dark: path.join(__filename, '..', '..', 'resources', 'dark', icon)
		};

		treeItem.command = {
			command: 'confluentCloud.selectResource',
			title: 'Select Resource',
			arguments: [treeItem, element]
		};

		treeItem.tooltip = JSON.stringify(element.resource);

		return treeItem;
	}

	async getChildren(element?: TreeNode | undefined): Promise<TreeNode[] | null | undefined> {

		if (!isConfigValid()) {
			return [];
		}

		if (element) {
			if (element.kind === 'EnvironmentList') {
				return confluentCloudResources.environments.map((e: Record<string, any>) => {
					return {
						label: e.display_name,
						collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
						kind: e.kind,
						resource: e
					};
				});
			} else if (element.kind === 'ClusterList') {
				// show clusters
				if (element.resource && element.resource.clusters) {
					return element.resource.clusters.map((e: Record<string, any>) => {
						return {
							label: e.spec.display_name,
							collapsibleState: vscode.TreeItemCollapsibleState.None,
							kind: e.kind,
							resource: e
						};
					});
				}
			} else if (element.kind === 'Environment') {

				let resources = [];

				if (element.resource?.clusters?.length > 0) {
					let count = element.resource?.clusters?.length;
					resources.push({ label: `Clusters (${count})`, collapsibleState: vscode.TreeItemCollapsibleState.Collapsed, resource: element.resource, kind: 'ClusterList' });
				}

				if (element.resource?.schemaRegistryClusters?.length > 0) {
					let count = element.resource?.schemaRegistryClusters?.length;
					resources.push({ label: `Schema Registry`, collapsibleState: vscode.TreeItemCollapsibleState.Collapsed, resource: element.resource, kind: 'SchemaRegistryList' });
				}

				return resources;
			}
		} else {
			return [
				{ label: 'Environments', collapsibleState: vscode.TreeItemCollapsibleState.Collapsed, kind: 'EnvironmentList' }
			];
		}
	}

	getParent?(element: TreeNode): vscode.ProviderResult<TreeNode> {
		throw new Error('Method not implemented.');
	}

	resolveTreeItem?(item: vscode.TreeItem, element: TreeNode, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TreeItem> {
		throw new Error('Method not implemented.');
	}

	async refresh(): Promise<void> {
		console.log('refresh...');
		await this.loadEnvironments();
		await Promise.all(confluentCloudResources.environments.map(async (e: any) => {
			await this.loadClusters(e);
			await this.loadSchemaRegistryClusters(e);
		}));
		this._onDidChangeTreeData.fire();
	}

	async loadEnvironments(): Promise<void> {
		var res = await confluent.getEnvironments();
		confluentCloudResources.environments = res.data.data;
	}

	async loadClusters(env: Record<string, any>): Promise<void> {
		console.log('load clusters...');
		let clusters = await confluent.getClusters(env.id);
		env.clusters = clusters.data.data || [];
	}

	async loadSchemaRegistryClusters(env: Record<string, any>): Promise<void> {
		console.log('load schema registry...');
		let schemaRegistryClusters = await confluent.getSchemaRegistryClusters(env.id);
		env.schemaRegistryClusters = schemaRegistryClusters.data.data || [];
	}

}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

const extensionUri: () => vscode.Uri = () => {
	const extensionUri = vscode.extensions.getExtension('emrantalukder.confluent-cloud-extension')?.extensionUri;
	if (!extensionUri) {
		throw new Error('Extension URI not found');
	}
	return extensionUri;
};

export class ResourceViewPanel {
	public static currentPanel: ResourceViewPanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private _disposables: vscode.Disposable[] = [];

	private constructor(panel: vscode.WebviewPanel) {
		this._panel = panel;

		const reactAppOnDisk = vscode.Uri.joinPath(extensionUri(), 'dist', 'webview', 'bundle.js');
		const reactAppUri = this._panel.webview.asWebviewUri(reactAppOnDisk);

		this._panel.webview.html = this._getWebviewContent(reactAppUri);

		this._setWebviewListener(this._panel.webview);
		
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
	}

	private _setWebviewListener(webview: vscode.Webview) {
		webview.onDidReceiveMessage((message) => {
			const command = message.command;
			const text = message.text;

			console.log(command, text);

			switch (command) {
				case "alert":
					vscode.window.showInformationMessage(text);
					return;
			}
		}, undefined, this._disposables);
	}

	private _getWebviewContent(scriptUri: vscode.Uri): string {
		const webview = this._panel.webview;
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

	public static render(item: any) {
		console.log('render...', item);
		if (ResourceViewPanel.currentPanel) {
			ResourceViewPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
		} else {
			const panel = vscode.window.createWebviewPanel(
				"confluentCloudResource", 
				"Confluent Cloud Resource", 
				vscode.ViewColumn.One, 
				{
					enableScripts: true
				});

			panel.iconPath = {
				dark: vscode.Uri.joinPath(extensionUri(), 'resources', 'dark', `${item.kind}.svg`),
				light: vscode.Uri.joinPath(extensionUri(), 'resources', 'light', `${item.kind}.svg`),
			};
			
			ResourceViewPanel.currentPanel = new ResourceViewPanel(panel);
		}
	}

	public dispose() {
		console.log('dispose...');
		ResourceViewPanel.currentPanel = undefined;

		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

}

var lastResourceSelected: {treeItem: vscode.TreeItem, node: TreeNode, timestamp: number} | null = null;

export function activate(context: vscode.ExtensionContext) {
	const resourceTreeDataProvider = new ResourceTreeDataProvider();
	resourceTreeDataProvider.refresh();
	vscode.window.registerTreeDataProvider('resourceTree', resourceTreeDataProvider);

	context.subscriptions.push(
		vscode.commands.registerCommand('confluentCloud.refreshResourceTree', () => {
			resourceTreeDataProvider.refresh();
		}),
		vscode.commands.registerCommand('confluentCloud.selectResource', (item, elem) => {
			console.log('resource selected...', item, elem);
			if(lastResourceSelected && lastResourceSelected.treeItem.label === item.label && lastResourceSelected.timestamp > Date.now() - 1000) {
				console.log('double click...');
				ResourceViewPanel.render(item);
				// return;
			}
			lastResourceSelected = {treeItem: item, node: elem, timestamp: Date.now()};
		}),
		vscode.commands.registerCommand('confluentCloud.viewResource', (item, elem) => {
			ResourceViewPanel.render(item);
		}),
		vscode.commands.registerCommand('confluentCloud.editResource', (item, elem) => {
			console.log('edit resource...', item);
		}),
		vscode.commands.registerCommand('confluentCloud.configureSchemaRegistry', (item, elem) => {
			console.log('configure schema registry...', item);
			let schemaRegistryClusters = item.resource.schemaRegistryClusters;
			let schemaRegistryApiKeys = vscode.workspace.getConfiguration().get('confluentCloud.schemaRegistryApiKeys');
			if(schemaRegistryClusters.length > 0) {
				console.log('schema registry...', schemaRegistryClusters);
			}
		}),
		vscode.commands.registerCommand('confluentCloud.openConfiguration', () => {
			vscode.commands.executeCommand('workbench.action.openSettings', '@ext:emrantalukder.confluent-cloud-extension');
		}),
		vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
			console.log('config changed...', event);
			if (event.affectsConfiguration('confluentCloud.apiKey') || event.affectsConfiguration('confluentCloud.apiSecret')) {
				resourceTreeDataProvider.refresh();
			}
		})
	);



}

// This method is called when your extension is deactivated
export function deactivate() { }
