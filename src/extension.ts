import * as vscode from 'vscode';
import * as path from 'path';
import * as pathParse from 'path-parse';

var activeContext: vscode.ExtensionContext;
var disposables:any[] = [];
var actionCount = 0;
var savedTag = "";

export function activate(context: vscode.ExtensionContext) {

	console.log("활성화됨");
	initSettings(context);
	activeContext = context;

	// 설정값 변경시 기존 값을 초기화하고 새로 읽어들임
	vscode.workspace.onDidChangeConfiguration(() => {
		console.log("설정파일 업데이트");
		actionCount = 0;
		savedTag = "";
    disposeSettings();
    initSettings(activeContext);
	});
}

export function deactivate() {}

// 초기화 및 릴리즈 ///////////////////////////////////////////////////////////////////////////////////

function initSettings(context: vscode.ExtensionContext) {
	const settings = vscode.workspace.getConfiguration('macroEx');
  const macroList = Object.keys(settings).filter((prop) => {
    return prop !== 'has' && prop !== 'get' && prop !== 'update';
	});

	macroList.forEach((name) => {
    const subMacros = vscode.commands.registerCommand(`macroEx.${name}`, function () {
      return settings[name].reduce((promise: any, action: any) => promise.then(() => executeCommand(action)), Promise.resolve());
    });

    context.subscriptions.push(subMacros);
    disposables.push(subMacros);
  });
}

function disposeSettings() {
  for (var disposable of disposables) {
    disposable.dispose();
  }
}

// Execute 함수 ///////////////////////////////////////////////////////////////////////////////////

function executeDelayCommand(time: number) {
  return new Promise((resolve) => setTimeout(() => resolve(), time));
}

async function executeCommandRepeat(command: string, times: number) {
  for (const index of Array(times)) {
      await vscode.commands.executeCommand(`macroEx.${command}`);
  }
}

function repText(s: string) {
	let s2 = s.replace("[__NO__]", actionCount.toString());
	let ret = s2.replace("[__SAVETAG__]", savedTag);

	let editor = vscode.window.activeTextEditor;
	if (editor && editor.document.fileName) {
		let fpath = path.parse(editor.document.fileName);
		return ret.replace("[__FILENAME__]", fpath.name);
	}

	return ret;
}

function executeCommand(action: any) {
  if (typeof action === 'object') {
		var command = action.command;
		var args = action.args;

		if (command === '$delay') {
				return executeDelayCommand(args.delay);
		} else if (command === '$clearCount') {
			actionCount = 0;
			vscode.window.showInformationMessage('Clear count : ' + actionCount);
			return true;
		} else if (command === '$addCount') {
			++actionCount;
			vscode.window.showInformationMessage('Added count : ' + actionCount);
			return true;
		} else if (command === '$subCount') {
			--actionCount;
			vscode.window.showInformationMessage('Subtracted count : ' + actionCount);
			return true;
		} else if (command === '$saveTag') {
			savedTag = repText(args.text);
			return true;
		} else if (command === '$replace') {
			let s = repText(args.text);
			return vscode.commands.executeCommand("type", {"text": s});
		} else if (args.hasOwnProperty('times')) {
			return executeCommandRepeat(command, args.times);
		}

		return vscode.commands.executeCommand(command, args);
	}

	return vscode.commands.executeCommand(action);
}