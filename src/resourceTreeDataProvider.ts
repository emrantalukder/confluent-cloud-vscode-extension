import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as confluent from './confluent';
import { isStringEmpty, isConfigValid } from './helpers';

let confluentCloudResources: Record<string, any> = {
	'environments': []
};

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
							collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
							kind: e.kind,
							resource: e
						};
					});
				}
			} else if (element.kind === 'Cluster') {
				let resources = [];

				if (element.resource?.connectors?.length > 0) {
					let count = element.resource?.connectors?.length;
					resources.push({ label: `Connectors (${count})`, collapsibleState: vscode.TreeItemCollapsibleState.Collapsed, resource: element.resource, kind: 'ConnectorList' });
				}

				return resources;
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
		this._onDidChangeTreeData.fire();
	}

	async loadClusters(env: Record<string, any>): Promise<void> {
		console.log('load clusters...');
		let clusters = await confluent.getClusters(env.id);
		env.clusters = clusters.data.data || [];
		for (let idx in env.clusters) {
			let cluster = env.clusters[idx];
			await this.loadConnectors(env, cluster);
		}
		this._onDidChangeTreeData.fire();
	}

	async loadConnectors(env: Record<string, any>, cluster: Record<string, any>): Promise<void> {
		console.log('load connectors...');
		// let connectors = await confluent.getConnectors(env.id, cluster.id);
		// cluster.connectors = connectors.data.data || [];
		cluster.connectors = ['a', 'b', 'c'];
		this._onDidChangeTreeData.fire();
	}

	async loadSchemaRegistryClusters(env: Record<string, any>): Promise<void> {
		console.log('load schema registry...');
		let schemaRegistryClusters = await confluent.getSchemaRegistryClusters(env.id);
		env.schemaRegistryClusters = schemaRegistryClusters.data.data || [];
		this._onDidChangeTreeData.fire();
	}

}

export {
    TreeNode,
    ResourceTreeDataProvider
};