import * as vscode from 'vscode';
import { Range } from 'vscode';
import "axios"
import {source_temp,source_temp_end,ApiResponse} from "./file_source";
import {MyInlineCompletionProvider,myStatusBarItem} from "./file_autocomplete";
import { url } from 'inspector';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
	console.log('gugu-ai-assistant start');
	
    context.subscriptions.push(myStatusBarItem);
	

	vscode.languages.registerInlineCompletionItemProvider({ pattern: '**' }, new MyInlineCompletionProvider);
}
