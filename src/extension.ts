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
			treeItem.contextValue = 'confluentCloudResource';
			icon = `${element.kind}.svg`;
		} else {
			switch (treeItem.label) {
				case "Clusters":
					icon = `Clusters.svg`;
					break;
				case "Schema Registry":
					icon = `SchemaRegistry.svg`;
					break;
				default:
					treeItem.contextValue = 'resourceNode';
			}
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
			if (element.label === 'Environments') {
				return confluentCloudResources.environments.map((e: Record<string, any>) => {
					return {
						label: e.display_name,
						collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
						kind: e.kind,
						resource: e
					};
				});
			} else if (element.label === 'Clusters') {
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
				return [
					{ label: 'Clusters', collapsibleState: vscode.TreeItemCollapsibleState.Collapsed, resource: element.resource },
					{ label: 'Schema Registry', collapsibleState: vscode.TreeItemCollapsibleState.Collapsed, resource: element.resource }
				];
			}
		} else {
			return [
				{ label: 'Environments', collapsibleState: vscode.TreeItemCollapsibleState.Collapsed }
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

}


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
		}),
		vscode.commands.registerCommand('confluentCloud.viewResource', (item, elem) => {
			console.log('view resource...', item);
		}),
		vscode.commands.registerCommand('confluentCloud.editResource', (item, elem) => {
			console.log('edit resource...', item);
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
