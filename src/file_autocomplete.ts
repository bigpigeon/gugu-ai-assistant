import * as vscode from "vscode";
import { source_temp, source_temp_end, ApiResponse, ApiMessage } from "./file_source";
import { dir_temp, tail_tips,rookie_role,senior_role,file_notfound_tip } from "./dir_source";
import { scm_cn_source_temp, scm_source_temp } from "./scm_source";
import * as path from 'path';
import { Range } from 'vscode';
import { exec } from "child_process";
import { rejects } from "assert";
import { XMLParser,XMLBuilder } from 'fast-xml-parser';
import { API as GitAPI, GitExtension, APIState } from './git';
import { DOMParser } from 'xmldom';
import {wildcardMatch} from "./wildcard";

const util = require('util');

export var myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
let outputChannel = vscode.window.createOutputChannel("gugu-ai-assistant");
let config = vscode.workspace.getConfiguration('gugu-ai-assistant');
let api_key = config.get('api_key');
let url_prefix = config.get('url_prefix') as string;
let model = config.get('model');
let max_tokens = 4096;
let temperature = config.get<number>('temperature');
let allow_autotrigger = config.get<boolean>('allow_autotrigger');
let autotrigger_delay_ms = config.get<number>('autotrigger_delay_ms') as number;
let git_diff_exclude = config.get<string[]>('git_diff_exclude') as string[];
let git_diff_file_maxlen = config.get<number>('git_diff_file_maxlen') as number;
let git_log_language = config.get<string>('git_log_language') as string;
let mode = config.get<string>("mode") as string 
let debug = config.get<boolean>("debug") as boolean 
let vegetable_pigeon = config.get<boolean>("vegetable_pigeon") as boolean
let counter: number = 0;

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function showLoading(n: number) {
    myStatusBarItem.text = "$(sync~spin)"+"咕".repeat(n)+"<$(issues)";
    myStatusBarItem.show();
}

function addFileToBarTooltip(name: string,filepath: string,exist: boolean) {
    if (exist) {
        let tooltip = myStatusBarItem.tooltip as vscode.MarkdownString
        if (tooltip.value == "") {
            tooltip.appendMarkdown("uploaded file:")
        }
        tooltip.appendMarkdown(`

[${name}](command:vscode.open?${encodeURIComponent(JSON.stringify(vscode.Uri.file(filepath)))})`)
        myStatusBarItem.show();
    } else {
        let tooltip = myStatusBarItem.tooltip as vscode.MarkdownString
        if (tooltip.value == "") {
            tooltip.appendMarkdown("uploaded file:")
        }
        tooltip.appendMarkdown("\n\n$(extensions-warning-message)"+name)
        myStatusBarItem.show();
    }
}

function statusBarInit() {
    myStatusBarItem.text = "<$(issues)"
    if (!myStatusBarItem.tooltip) {
        myStatusBarItem.tooltip = new vscode.MarkdownString("")
        myStatusBarItem.tooltip.isTrusted = true
    }
    (myStatusBarItem.tooltip as vscode.MarkdownString).value = ""
    
    myStatusBarItem.show();
}

function hideLoading() {
    myStatusBarItem.text = "<$(issues)"
    myStatusBarItem.show();
}

function errorLoading() {
    myStatusBarItem.text = "<$(stop)"
    myStatusBarItem.show();
}

function insertSubstring(original: string, substring: string, index: number): string {
    return original.slice(0, index) + substring + original.slice(index);
}
function removeCompletionTags(input: string): string {
    return input.replace(/<COMPLETION>|<\/COMPLETION>/g, '').trimStart();
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
    if (e.affectsConfiguration('gugu-ai-assistant.mode')) {
        let config = vscode.workspace.getConfiguration('gugu-ai-assistant');
        mode = config.get('mode') as string;
    }
    if (e.affectsConfiguration('gugu-ai-assistant.debug')) {
        let config = vscode.workspace.getConfiguration('gugu-ai-assistant');
        debug = config.get('debug') as boolean;
    }
    if (e.affectsConfiguration('gugu-ai-assistant.vegetable_pigeon')) {
        let config = vscode.workspace.getConfiguration('gugu-ai-assistant');
        vegetable_pigeon = config.get('vegetable_pigeon') as boolean;
    }
});



export class MyInlineCompletionProvider implements vscode.InlineCompletionItemProvider {
    constructor() {
        statusBarInit()
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
            case "git-commit":
            case "lua":
            case "shellscript":
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
        }
        
        if (curr != counter) {
            return;
        }
        outputChannel.appendLine("document language type "+ document.languageId)

        let question: string;
        const result: vscode.InlineCompletionList = {
            items: [],
            commands: [],
        };
        // let uri = document.uri.toJSON();
        if (document.languageId == "scminput" || document.languageId == "git-commit") {
            let difflog = await getDiff()
            if (difflog as string) {
                let question_prefix = scm_source_temp
                switch ((git_log_language as string).trim()){
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
            statusBarInit()
            switch (mode) {
            case "single_file":{
                let code = document.getText()
                code = insertSubstring(code, "{{FILL_HERE}}", document.offsetAt(position))
                question = source_temp + code + source_temp_end;
                break;
            }
            case "current_dir":{
                let curr_dir = path.dirname(document.uri.fsPath)          
                let curr_rel_dir = vscode.workspace.asRelativePath(curr_dir)
                let files = await vscode.workspace.findFiles(new vscode.RelativePattern(curr_dir, "*"))
                
                let file_paths = files.map(file => path.basename(file.fsPath))
                let code = document.getText()
                
                code = insertSubstring(code, "{{FILL_HERE}}", document.offsetAt(position))
                let files_str = file_paths.join(" ")
                let project_block = `<PROJECT_DIR>${curr_rel_dir}:\n${files_str}</PROJECT_DIR>\n`
                let curr_fspath = vscode.workspace.asRelativePath(document.uri.fsPath)
                addFileToBarTooltip(curr_fspath,document.uri.fsPath,true)
                let file_block = `<FILE_FILL path="${curr_fspath}">${code}</FILE_FILL>\n`

                // get all files path relate by workspace path
                if (vegetable_pigeon) {
                    question = rookie_role + dir_temp + project_block + file_block + tail_tips
                } else {
                    question = senior_role + dir_temp + project_block + file_block + tail_tips
                }
                
                
                break;
            }
                
            case "all_dir":{
                question = ""
                
                break;
            }
            default:
                return 
            }
        }
       
        try {
            let content = await this.firstAsk(question)
            if (content == "") {
                vscode.window.showInformationMessage(`无需填充任何代码`);
            }else {
                result.items.push({
                    insertText: content,
                    range: new Range(position.line, position.character, position.line, position.character + 1),
                    completeBracketPairs: false,
                });
                hideLoading();
            }
        }
        catch (error: any) {
            vscode.window.showErrorMessage(`API 请求失败：${error.message}`);
            errorLoading();
            throw error;
        }
        

        return result;
    }

    async request(history: ApiMessage[],question: string, token: string):Promise<Response> {
        const startTime = Date.now();
        let stop_token:string[] = []
        let url = path.join(url_prefix, "/chat/completions")
        history.push({ "role": "user", "content": question })
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({
                "model": model,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "stop": stop_token,
                "messages": history,
            }),
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api_key }
        });
        if (response.status !== 200) {
            let obj = await response.json()
            outputChannel.appendLine(
                "错误返回:"+ JSON.stringify(obj, null, 2)
            )
            throw new Error(`API request failed with status ${response.status}`);
        }

        const endTime = Date.now();
        outputChannel.appendLine(
            "-----------------------------------------\n" +
            "model: " + model + " max_tokens: " + max_tokens?.toString() + " temperature: " + temperature?.toString() + "\n" +
            "url: " + url + "\n" +
            "停止符: " + JSON.stringify(stop_token) + "\n" +
            "请求耗时: " + (endTime - startTime).toString() + "ms\n" +
            "请求内容: " + question
        )
        return response
    }

    async firstAsk(firstQuestion: string):Promise<string> {
        let val = await this.tryContinueAsk([],firstQuestion, 1)
        return val
    }

    async tryContinueAsk(history: ApiMessage[], question: string, n: number):Promise<string> {
        showLoading(n)
        let response = await this.request(history,question, "")
        let obj = await response.json() as ApiResponse
        if (debug) {
            outputChannel.appendLine(
                "gpt返回:"+ JSON.stringify(obj, null, 2)
            )
        }
        let ask = obj.choices[0].message.content.trim()
        outputChannel.appendLine(
            "回答: "+ask,
        )
        if (ask.startsWith("<Need>")) {
            // parse xml with <Need><FILE_1 path="xxx"><...></Need>
            // handle xml response
            let parser = new XMLParser({
                ignoreAttributes: false
            });
            let askJson = parser.parse(ask)
            if (askJson["Need"] != null) {
                let needObj = askJson["Need"] as any
                for (let key in needObj) {
                    let fileObj = needObj[key] as any
                    // filepath is relative by workspace
                    let filepath = fileObj["@_path"] as string 
                    // convert to abs path
                    let absFilePath = path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, filepath)
                    
                    // check file exist
                    if (await checkFileExists(vscode.Uri.file(absFilePath))) {
                        let fileContent = await vscode.workspace.fs.readFile(vscode.Uri.file(absFilePath))
                        addFileToBarTooltip(filepath,absFilePath,true)
                        fileObj["#text"] = "\n"+ Buffer.from(fileContent).toString('utf8');
                    } else {
                        fileObj["#text"] = file_notfound_tip
                        addFileToBarTooltip(filepath,absFilePath,false)       
                    }
                }
            }
            let builder = new XMLBuilder({
                ignoreAttributes: false,
                format: true
            })
            // encode xmlDoc to string 
            let secondQuestion = builder.build(askJson)
            history.push(obj.choices[0].message)
            return await this.tryContinueAsk(history, secondQuestion,n+1)
        } else if (ask.startsWith("<COMPLETION>")){
            return removeCompletionTags(ask)
        } else {
            // throw error pannel
            throw new Error(`API 返回格式错误：${ask}`);
        }
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

async function checkFileExists(uri: vscode.Uri): Promise<boolean> {
    try {
        // 调用 stat 来检查文件
        await vscode.workspace.fs.stat(uri);
        return true; // 如果能正常执行到这里，说明文件存在
    } catch (error) {
        if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
            // 捕获文件未找到的错误
            return false;
        } else {
            // 其他未知错误，重新抛出
            throw error;
        }
    }
}

async function showDiffLog(): Promise<string | undefined> {
    // 获取当前工作区
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showInformationMessage('没有打开的工作区咕！');
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
                    vscode.window.showErrorMessage(`执行 Git 命令时出错咕：${error.message}`);
                    return;
                }

                if (stderr) {
                    vscode.window.showErrorMessage(`Git 命令返回错误咕：${stderr}`);
                    return;
                }

                if (!stdout) {
                    vscode.window.showInformationMessage('没有 Git 修改咕！');
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
            let diff = await repo.diffIndexWithHEAD(ch.uri.fsPath)
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