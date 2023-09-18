// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Game } from "@gathertown/gather-game-client";
import axios from 'axios';
//@ts-ignore
global.WebSocket = require("isomorphic-ws")
var useManualStatus = false;
var game: Game;
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let output = vscode.window.createOutputChannel("GatherTown");


	var apiKey = vscode.workspace.getConfiguration("gathertown").get("apikey") as string;
	var spaceid = vscode.workspace.getConfiguration("gathertown").get("spaceid") as string;
	var url = vscode.workspace.getConfiguration("gathertown").get("gitlabUrl") as string;
	var gitlabToken = vscode.workspace.getConfiguration("gathertown").get("gitlabToken") as string;
	output.appendLine("API Key: " + apiKey);
	output.appendLine("spaceid " + spaceid);


	// gather game client setup
	game = new Game(spaceid, () => Promise.resolve({ apiKey: apiKey }));
	game.connect();
	game.subscribeToConnection((connected) => {		
		output.appendLine("connected? " + connected);
	});
	var issueId = context.globalState.get("issueId");
	var issueProjectId = context.globalState.get("issueProjectId");
	output.appendLine(`issueId: ${issueId}`);
	output.appendLine(`issueProjectId: ${issueProjectId}`);

	if(issueId && issueProjectId){		
		axios.get(`${url}/api/v4/projects/${issueProjectId}/issues/${issueId}?private_token=${gitlabToken}`, {headers:{"PRIVATE-TOKEN":gitlabToken}}).then((response) => {
			game.setTextStatus(`#${issueId} ${response.data.title}`);
		}).catch((error) => {
			output.appendLine(error);
		});
	}
	
	vscode.window.onDidChangeActiveTextEditor((editor: any) => {
		var workspaceName = vscode.workspace.name;
		var filePath = vscode.window.activeTextEditor?.document.fileName;
		var fileName = filePath?.slice(filePath?.lastIndexOf('/')+1, filePath.length);
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
	});
	context.subscriptions.push(disposable);

	let disposable2 = vscode.commands.registerCommand('gathertown.setStatusFromGitlabIssue', async () => {
		var id = "";
		var groupsOrProjects = vscode.workspace.getConfiguration("gathertown").get("groupOrProject");
		if(groupsOrProjects === "groups"){
			id = vscode.workspace.getConfiguration("gathertown").get("gitlabGroupId") as string;			
		}
		else {
			id = vscode.workspace.getConfiguration("gathertown").get("gitlabProjectId") as string;
		}
		axios.get(`${url}/api/v4/${groupsOrProjects}/${id}/issues?private_token=${gitlabToken}&state=opened`, {headers:{"PRIVATE-TOKEN":gitlabToken}}).then((response) => {
			var issues = response.data;
			var options = issues.map((issue: any) => {
				return {
					iid: issue.iid,
					projectId: issue.project_id,
					lables: issue.labels,
					label: `#${issue.iid} ${issue.title}`,
					description: issue.web_url
				};
			});
			vscode.window.showQuickPick(options).then((issue:any) => {
				if(issue){			
					game.setTextStatus(issue.label);
					output.appendLine(`Labels: ${JSON.stringify(issue)}}`);
					output.appendLine(`Labels: ${issue.lables as string[]}`);
					var issueIid = issue.iid;
					var issueProjectId = issue.projectId;
					context.globalState.update("issueId", issueIid);;
					context.globalState.update("issueProjectId", issueProjectId);
					axios.put(`${url}/api/v4/projects/${issue.projectId}/issues/${issue.iid}?private_token=${gitlabToken}&remove_labels=Essential List&add_labels=Doing - Active`, {headers:{"PRIVATE-TOKEN":gitlabToken}}).then((response) => {
						output.appendLine(JSON.stringify(response.headers));
					}).catch((error) => {
						output.appendLine(error);
					});
				}
			});
		}).catch((error) => {
			output.appendLine(error);
		});


	});
	context.subscriptions.push(disposable2);
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
}

// This method is called when your extension is deactivated
export function deactivate() {
	game.setTextStatus(``);	
	game.disconnect().then(() => {
		console.log("disconnected");
	});
}

