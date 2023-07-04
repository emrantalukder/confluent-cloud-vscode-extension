import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

import * as Confluent from '../../confluent';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Starting Extension Test Suite.');

	test('Sample test', async () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});
});

suite('Confluent Cloud Test Suite', () => {
	vscode.window.showInformationMessage('Testing Confluent Cloud API Calls.');

	test('Resources test', async () => {
		let res = await Confluent.getEnvironments();
		let environments = res.data.data;
		assert(environments.length > 0);

		for(let idx in environments) {
			let env = environments[idx];
			let clusters = await Confluent.getClusters(env.id); 
			env.clusters = clusters.data.data || [];
			console.log(`env: ${env.id}`);
			console.log(env.clusters.map((c:any) => c.id));
		}
	})
	.timeout(60000);
});