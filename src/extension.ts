// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Game } from "@gathertown/gather-game-client";
//@ts-ignore
global.WebSocket = require("isomorphic-ws")
var useManualStatus = false;
var game: Game;
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let output = vscode.window.createOutputChannel("GatherTown");
	output.show();
	var apikey = vscode.workspace.getConfiguration("gathertown").get("apikey") as string;
	var spaceid = vscode.workspace.getConfiguration("gathertown").get("spaceid") as string;
	output.appendLine("API Key: " + JSON.stringify(apikey));
	output.appendLine("spaceid " + JSON.stringify(spaceid));
	// gather game client setup
	game = new Game(spaceid, () => Promise.resolve({ apiKey: apikey }));
	game.connect();
	game.subscribeToConnection((connected) => {		
		output.appendLine("connected? " + connected);
	});
	vscode.window.onDidChangeActiveTextEditor((editor: any) => {
		var workspaceName = vscode.workspace.name;
		var filePath = vscode.window.activeTextEditor?.document.fileName;
		var fileName = filePath?.slice(filePath?.lastIndexOf('/')+1, filePath.length);
		output.appendLine("workspace: " + workspaceName);
		output.appendLine("file: " + fileName);
		var status = "";
		if(vscode.workspace.getConfiguration("gathertown").get("showWorkspaceName") as boolean){
			status += workspaceName + " ";
		}
		if(vscode.workspace.getConfiguration("gathertown").get("showFileName") as boolean){
			status += fileName;
		}
		if(vscode.workspace.getConfiguration("gathertown").get("showStatus") as boolean){
			if(vscode.workspace.getConfiguration("gathertown").get("useManualStatus") as boolean){
				status = vscode.workspace.getConfiguration("gathertown").get("manualStatus") as string;
			}
			game.setTextStatus(status);		
		}else {
			game.setTextStatus("");			
		}
	});
	let disposable = vscode.commands.registerCommand('gathertown.setStatusManually', async () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		var status = "";
		const manualStatus = await vscode.window.showInputBox({
			placeHolder: "Satus",
			prompt: "Set the status",
			value: status
		});
		useManualStatus = true;
		vscode.workspace.getConfiguration("gathertown").update("manualStatus", manualStatus).then(() => {
			game.setTextStatus(manualStatus ?? "");
		});
		vscode.window.showInformationMessage('Hello World from test-ext!');
	});

	context.subscriptions.push(disposable);
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "gathertown-vscode-status" is now active!' + apikey);
}

// This method is called when your extension is deactivated
export function deactivate() {
	game.setTextStatus(``);	
}

