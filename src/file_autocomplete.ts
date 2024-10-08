import * as vscode from "vscode";
import { source_temp, source_temp_end, ApiResponse } from "./file_source";
import { scm_cn_source_temp, scm_source_temp } from "./scm_source";
import * as path from 'path';
import { Range } from 'vscode';
import { exec } from "child_process";
import { rejects } from "assert";
import { API as GitAPI, GitExtension, APIState } from './git';
import {wildcardMatch} from "./wildcard";

const util = require('util');

export var myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
let outputChannel = vscode.window.createOutputChannel("gugu-ai-assistant");
let config = vscode.workspace.getConfiguration('gugu-ai-assistant');
let api_key = config.get('api_key');
let url_prefix = config.get('url_prefix') as string;
let model = config.get('model');
let max_tokens = config.get<number>('max_tokens');
let temperature = config.get<number>('temperature');
let allow_autotrigger = config.get<boolean>('allow_autotrigger');
let autotrigger_delay_ms = config.get<number>('autotrigger_delay_ms') as number;
let git_diff_exclude = config.get<string[]>('git_diff_exclude') as string[];
let git_diff_file_maxlen = config.get<number>('git_diff_file_maxlen') as number;
let git_log_language = config.get<string>('git_log_language') as string;
let counter: number = 0;

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function showLoading() {
    myStatusBarItem.text = "$(sync~spin)咕~🕊️";
    myStatusBarItem.show();
}
function hideLoading() {
    myStatusBarItem.hide();
}

function insertSubstring(original: string, substring: string, index: number): string {
    return original.slice(0, index) + substring + original.slice(index);
}
function removeCompletionTags(input: string): string {
    return input.replace(/<COMPLETION>|<\/COMPLETION>/g, '');
}

vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('gugu-ai-assistant.api_key')) {
        let config = vscode.workspace.getConfiguration('gugu-ai-assistant');
        api_key = config.get('api_key');
    }
    if (e.affectsConfiguration('gugu-ai-assistant.url_prefix')) {
        let config = vscode.workspace.getConfiguration('gugu-ai-assistant');
        url_prefix = config.get('url_prefix') as string;
    }
    if (e.affectsConfiguration('gugu-ai-assistant.model')) {
        let config = vscode.workspace.getConfiguration('gugu-ai-assistant');
        model = config.get('model');
    }

    if (e.affectsConfiguration('gugu-ai-assistant.max_tokens')) {
        let config = vscode.workspace.getConfiguration('gugu-ai-assistant');
        max_tokens = config.get<number>('max_tokens');
    }
    if (e.affectsConfiguration('gugu-ai-assistant.temperature')) {
        let config = vscode.workspace.getConfiguration('gugu-ai-assistant');
        temperature = config.get<number>('temperature');
    }
    if (e.affectsConfiguration('gugu-ai-assistant.allow_autotrigger')) {
        let config = vscode.workspace.getConfiguration('gugu-ai-assistant');
        allow_autotrigger = config.get<boolean>('allow_autotrigger');
    }
    if (e.affectsConfiguration('gugu-ai-assistant.autotrigger_delay_ms')) {
        let config = vscode.workspace.getConfiguration('gugu-ai-assistant');
        autotrigger_delay_ms = config.get<number>('autotrigger_delay_ms') as number;
    }
    if (e.affectsConfiguration('gugu-ai-assistant.git_diff_exclude')) {
        let config = vscode.workspace.getConfiguration('gugu-ai-assistant');
        git_diff_exclude = config.get<string[]>('git_diff_exclude') as string[];
    }
    if (e.affectsConfiguration('gugu-ai-assistant.git_diff_file_maxlen')) {
        let config = vscode.workspace.getConfiguration('gugu-ai-assistant');
        git_diff_file_maxlen = config.get<number>('git_diff_file_maxlen') as number;
    }
    
    if (e.affectsConfiguration('gugu-ai-assistant.git_log_language')) {
        let config = vscode.workspace.getConfiguration('gugu-ai-assistant');
        git_log_language = config.get('git_log_language') as string;
    }
});



export class MyInlineCompletionProvider implements vscode.InlineCompletionItemProvider {
    constructor() {

    }

    async provideInlineCompletionItems(
        document: vscode.TextDocument, position: vscode.Position, context: vscode.InlineCompletionContext, token: vscode.CancellationToken) {
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
            case "javascriptreact":
            case "typescriptreact":
            case "vue":
            case "vue-html":
            case "rust":
            case "python":
            case "scminput":
                break
            default:
                return;
        }

        let curr = ++counter;
        if (context.triggerKind == vscode.InlineCompletionTriggerKind.Automatic) {
            if (allow_autotrigger) {
                await delay(autotrigger_delay_ms)
            } else {
                return;
            }
        } else {
            console.log("trigger with manual")
        }

        if (curr != counter) {
            return;
        }

        let question: string;
        const result: vscode.InlineCompletionList = {
            items: [],
            commands: [],
        };
        // let uri = document.uri.toJSON();
        if (document.languageId == "scminput") {
            let difflog = await getDiff()
            if (difflog as string) {
                let question_prefix = scm_source_temp
                switch (git_log_language.trim()){
                    case "中文":
                        question_prefix = scm_cn_source_temp
                        break
                    case "english":
                        question_prefix = scm_source_temp
                        break
                }
                question = question_prefix + difflog
            } else {
                return
            }

        } else {
            if (position.line <= 0) {
                return;
            }
            let code = document.getText()
            code = insertSubstring(code, "{{FILL_HERE}}", document.offsetAt(position))
            question = source_temp + code + source_temp_end;
        }

        try {
            showLoading()
            const startTime = Date.now();
            let stop_token = ["func", "package", "import", "type", "/src/", "#- coding: utf-8", "```"]
            let url = path.join(url_prefix, "/chat/completions")
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
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api_key }
            });
            const endTime = Date.now();
            hideLoading();

            outputChannel.append(
                "-----------------------------------------\n" +
                "model: " + model + " max_tokens: " + max_tokens?.toString() + " temperature: " + temperature?.toString() + "\n" +
                "url: " + url + "\n" +
                "停止符: " + JSON.stringify(stop_token) + "\n" +
                "请求耗时: " + (endTime - startTime).toString() + "ms\n" +
                "请求内容: " + question
            )
            if (!response.ok) {
                console.error("Error");
                return;
            } else if (response.status >= 400) {
                console.error('HTTP Error: ' + response.status.toString() + ' - ' + response.statusText);
            }
            else {
                let obj = await response.json() as ApiResponse
                // let chooices: any[] = obj.choices
                for (const v of obj.choices) {
                    let content = removeCompletionTags(v.message.content)
                    result.items.push({
                        insertText: content,
                        range: new Range(position.line, position.character, position.line, position.character + 1),
                        completeBracketPairs: false,
                    });
                }
            }
        }
        catch (error: any) {
            vscode.window.showErrorMessage(`API 请求失败：${error.message}`);
            throw error;
        }

        return result;
    }

    handleDidShowCompletionItem(completionItem: vscode.InlineCompletionItem): void {
        // console.log('handleDidShowCompletionItem');
    }

    /**
     * Is called when an inline completion item was accepted partially.
     * @param acceptedLength The length of the substring of the inline completion that was accepted already.
     */
    handleDidPartiallyAcceptCompletionItem(
        completionItem: vscode.InlineCompletionItem,
        info: vscode.PartialAcceptInfo | number
    ): void {
        // console.log('handleDidPartiallyAcceptCompletionItem');
    }
}

async function showDiffLog(): Promise<string | undefined> {
    // 获取当前工作区
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showInformationMessage('没有打开的工作区嘎！');
        return;
    }

    // 假设我们使用第一个工作区
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    // 执行 Git 命令获取所有修改
    // const execPromise = util.promisify(exec);

    async function fecthGitLog(): Promise<string | undefined> {
        return new Promise((resolve, reject) => {
            exec(`git diff HEAD `, { cwd: workspaceRoot }, (error, stdout, stderr) => {
                if (error) {
                    vscode.window.showErrorMessage(`执行 Git 命令时出错嘎：${error.message}`);
                    return;
                }

                if (stderr) {
                    vscode.window.showErrorMessage(`Git 命令返回错误嘎：${stderr}`);
                    return;
                }

                if (!stdout) {
                    vscode.window.showInformationMessage('没有 Git 修改嘎！');
                    return;
                }
                resolve(stdout)
            })
        });
    }
    let exec_result = await fecthGitLog();
    // 创建一个新文档来显示 diff 内容
    return exec_result
}



async function getDiff(): Promise<string | undefined> {
    // 获取工作区文件夹
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showInformationMessage('没有打开的工作区！');
        return;
    }

    // 获取 Git 扩展
    const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git');
    if (!gitExtension) {
        vscode.window.showErrorMessage('Git 扩展未安装或未启用！');
        return;
    }

    const git = gitExtension.exports.getAPI(1);

    // 获取当前工作区的 Git 仓库
    const repo = git.getRepository(workspaceFolders[0].uri);

    if (!repo) {
        vscode.window.showInformationMessage('当前工作区不是 Git 仓库！');
        return;
    }
    // 获取修改
    const changes = await repo.diffIndexWithHEAD();
    
    
    // 显示修改
    if (changes.length === 0) {
        vscode.window.showInformationMessage('没有检测到修改。');
    } else {
        let diffContent = '';
        for(let i=0;i<changes.length;i++) {
            let ch = changes[i]
            if (needIgnoreFile(ch.uri.fsPath)){
                continue
            }
            let diff = await repo.diffIndexWithHEAD(ch.uri.path)
            if (diff.length > git_diff_file_maxlen){
                continue
            }
            diffContent += diff as string
        }
        return diffContent
        //  vscode.window.showInformationMessage(`检测到以下修改：\n${changesStr}`);
    }

}

function needIgnoreFile(fs: string) :boolean {
    for(let igno of git_diff_exclude) {
        if (wildcardMatch(igno,fs)) {
            return true
        }
    }
    return false
}