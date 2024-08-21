import * as vscode from 'vscode';
import { Range } from 'vscode';
import "axios"
import {source_temp,source_temp_end,ApiResponse} from "./source";
import { url } from 'inspector';

export function activate(context: vscode.ExtensionContext) {
	console.log('inline-completions demo started');
	let outputChannel = vscode.window.createOutputChannel("gugu-ai-assistant");
	let config = vscode.workspace.getConfiguration('gugu-ai-assistant');
	let api_key = config.get('api_key');
	let url_prefix = config.get('url_prefix') as string;
	let model = config.get('model');
	let max_tokens = config.get<number>('max_tokens');
	let temperature = config.get<number>('temperature');
	let allow_autotrigger = config.get<boolean>('allow_autotrigger');
	let autotrigger_delay_ms = config.get<number>('autotrigger_delay_ms') as number;
	let counter:number = 0;
	function delay(ms: number) {
		return new Promise( resolve => setTimeout(resolve, ms) );
	}
	vscode.workspace.onDidChangeConfiguration(e => {
		if (e.affectsConfiguration('gugu-ai-assistant.api_key')) {
			api_key = config.get('api_key');
		}
		if (e.affectsConfiguration('gugu-ai-assistant.url_prefix')) {
			url_prefix = config.get('url_prefix') as string ;
		}
		if (e.affectsConfiguration('gugu-ai-assistant.model')) {
			model = config.get('model');
		}
		
		if (e.affectsConfiguration('gugu-ai-assistant.max_tokens')) {
			max_tokens = config.get<number>('max_tokens');
		}
		if (e.affectsConfiguration('gugu-ai-assistant.temperature')) {
			temperature = config.get<number>('temperature');
		}
		if (e.affectsConfiguration('gugu-ai-assistant.allow_autotrigger')) {
			allow_autotrigger = config.get<boolean>('allow_autotrigger');
		}
		if (e.affectsConfiguration('gugu-ai-assistant.autotrigger_delay_ms')) {
			autotrigger_delay_ms = config.get<number>('autotrigger_delay_ms') as number;
		}
	});
	function insertSubstring(original: string, substring: string, index: number): string {
		return original.slice(0, index) + substring + original.slice(index);
	}
	function removeCompletionTags(input: string): string {
		return input.replace(/<COMPLETION>|<\/COMPLETION>/g, '');
	}

	const provider: vscode.InlineCompletionItemProvider = {
		async provideInlineCompletionItems(document, position, context, token) {
			// context.triggerKind
			switch (document.languageId) {
				case "go":
				case "javascript":
				case "typescript":
				case "html":
				case "css":
				case "scss":
				case "less":
				case "markdown":
					break
				default:
					return;
			}
			
			let curr = ++counter;
			if(context.triggerKind == vscode.InlineCompletionTriggerKind.Automatic){
				if (allow_autotrigger) {
					await delay(autotrigger_delay_ms)
				} else {
					return;
				}
			}else {
				console.log("trigger with manual")
			}

			if (curr != counter){
				return;
			}
			
			if (position.line <= 0) {
				return;
			}

			const result: vscode.InlineCompletionList = {
				items: [],
				commands: [],
			};
			let code = document.getText()
			code = insertSubstring(code,"{{FILL_HERE}}", document.offsetAt(position))
			let question = source_temp+code+source_temp_end;
			
			try {
				const startTime = Date.now();
				let stop_token = ["func","package","import","type","/src/","#- coding: utf-8","```"]
				let url = new URL("/chat/completions", url_prefix).href
				const response = await fetch(url, {
					method: 'POST',
					body: JSON.stringify({
						"model": model,
						"max_tokens": max_tokens,
						"temperature": temperature,
						"stop": stop_token,
						"messages": [{
							"role": "user",
							"content": question,
						}]
					}),
					headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer '+api_key} 
				});
				const endTime = Date.now();
				outputChannel.append(
					"-----------------------------------------\n"+
					"model: " + model+" max_tokens: " + max_tokens?.toString() + " temperature: "+temperature?.toString()+"\n"+
					"url: "+url+"\n"+
					"停止符: "+JSON.stringify(stop_token)+"\n"+
					"请求耗时: "+ (endTime - startTime).toString() +"ms\n"+
					"请求内容: "+ question 
				)
				if (!response.ok) 
					{
						console.error("Error");
						return ;
					}  else if (response.status >= 400) {
						console.error('HTTP Error: '+response.status.toString()+' - '+response.statusText);
					}
					else{
						let obj = await response.json() as ApiResponse
						// let chooices: any[] = obj.choices
						for (const v of obj.choices) {
							let content = removeCompletionTags(v.message.content)
							result.items.push({
								insertText: content,
								range: new Range(position.line,position.character,position.line,position.character+1),
								completeBracketPairs: false,
							});
						}
					}
			}
			catch  (error: any) {
				vscode.window.showErrorMessage(`API 请求失败：${error.message}`);
				throw error;
			}

			return result;
		},

		handleDidShowCompletionItem(completionItem: vscode.InlineCompletionItem): void {
			// console.log('handleDidShowCompletionItem');
		},

		/**
		 * Is called when an inline completion item was accepted partially.
		 * @param acceptedLength The length of the substring of the inline completion that was accepted already.
		 */
		handleDidPartiallyAcceptCompletionItem(
			completionItem: vscode.InlineCompletionItem,
			info: vscode.PartialAcceptInfo | number
		): void { 
			// console.log('handleDidPartiallyAcceptCompletionItem');
		},
	};
	vscode.languages.registerInlineCompletionItemProvider({ pattern: '**' }, provider);
}
