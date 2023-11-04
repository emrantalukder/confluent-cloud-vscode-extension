import * as vscode from 'vscode';

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

export {
    isConfigValid,
    isStringEmpty,
    getNonce,
    extensionUri
};