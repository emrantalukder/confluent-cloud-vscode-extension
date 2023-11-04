import * as vscode from 'vscode';
import { isConfigValid } from './helpers';
import { ResourceViewPanel, openWebViews } from './resourceViewPanel';
import { ResourceTreeDataProvider, TreeNode } from './resourceTreeDataProvider';


// global variables
let resourceTreeDataProvider: ResourceTreeDataProvider;
var lastResourceSelected: {treeItem: vscode.TreeItem, node: TreeNode, timestamp: number} | null = null;

/**
 * activateResourceView: activate resource view
 * @param item tree item selected
 * @param elem bound data element
 * @returns 
 */
const activateResourceView = (item: any, elem: any) => {
	if(openWebViews.has(item.resource.id)) {
		let resourceViewPanel = openWebViews.get(item.resource.id);
		resourceViewPanel?.panel.reveal();
		return;
	} else {
		let resourceViewPanel = ResourceViewPanel.render(item);
		openWebViews.set(item.resource.id, resourceViewPanel);
	}
};

/**
 * refreshResourceTree: refresh resource tree
 */
const refreshResourceTree =  () => {
	resourceTreeDataProvider.refresh();
};

/**
 * selectResource: resource has been clicked or highlighted
 * @param item tree item selected
 * @param elem bound data element
 */
const selectResource = (item: any, elem: any) => {
	console.log('resource selected...', item, elem);
	if(lastResourceSelected && lastResourceSelected.treeItem.label === item.label && lastResourceSelected.timestamp > Date.now() - 1000) {
		item.resource = elem.resource;
		item.kind = elem.kind;
		activateResourceView(item, elem);
	}
	lastResourceSelected = {treeItem: item, node: elem, timestamp: Date.now()};
};

/**
 * editResource: edit resource
 * @param item item selected
 * @param elem bound data element
 */
const editResource = (item: any, elem: any) => {
	console.log('edit resource...', item);
};

/**
 * configureSchemaRegistry: open extension configuration view
 * @param item item selected
 * @param elem bound data element
 */
const configureSchemaRegistry = (item: any, elem: any) => {
	console.log('configure schema registry...', item);
	let schemaRegistryClusters = item.resource.schemaRegistryClusters;
	let schemaRegistryApiKeys = vscode.workspace.getConfiguration().get('confluentCloud.schemaRegistryApiKeys');
	if(schemaRegistryClusters.length > 0) {
		console.log('schema registry...', schemaRegistryClusters);
	}
};

/**
 * openConfiguration: open extension configuration view
 */
const openConfiguration = () => {
	vscode.commands.executeCommand('workbench.action.openSettings', '@ext:emrantalukder.confluent-cloud-extension');
};

/**
 * onDidChangeConfiguration: configuration has changed
 * @param event configuration change event
 */
const onDidChangeConfiguration = (event: vscode.ConfigurationChangeEvent) => {
	console.log('config changed...', event);
	if (
		(event.affectsConfiguration('confluentCloud.apiKey') || event.affectsConfiguration('confluentCloud.apiSecret')) &&
		isConfigValid()
	) {
		resourceTreeDataProvider.refresh();
	}
};


/**
 * Activates VS Code extension: method is called when extension is activated
 * @param context vscode extension context
 */
export function activate(context: vscode.ExtensionContext) {
	resourceTreeDataProvider = new ResourceTreeDataProvider();
	resourceTreeDataProvider.refresh();
	vscode.window.registerTreeDataProvider('resourceTree', resourceTreeDataProvider);

	context.subscriptions.push(
		vscode.commands.registerCommand('confluentCloud.refreshResourceTree', refreshResourceTree),
		vscode.commands.registerCommand('confluentCloud.selectResource', selectResource),
		vscode.commands.registerCommand('confluentCloud.viewResource', activateResourceView),
		vscode.commands.registerCommand('confluentCloud.editResource', editResource),
		vscode.commands.registerCommand('confluentCloud.configureSchemaRegistry', configureSchemaRegistry),
		vscode.commands.registerCommand('confluentCloud.openConfiguration', openConfiguration),
		vscode.workspace.onDidChangeConfiguration(onDidChangeConfiguration)
	);
}


/**
 * Deactivates VS Code extension: method is called when extension is deactivated
 */
export function deactivate() {
	for (const webView of openWebViews.values()) {
		webView.dispose();
	}
}
