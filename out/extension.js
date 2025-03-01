"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const ragService_1 = require("./ragService");
const vulnerabilityPanel_1 = require("./vulnerabilityPanel");
let vulnerabilityPanel;
const ragService = new ragService_1.RagService();
function activate(context) {
    console.log('代码漏洞检测器已激活');
    // 注册打开漏洞分析面板的命令
    const openPanelCommand = vscode.commands.registerCommand('vulnerability-detector.openVulnerabilityPanel', () => {
        if (!vulnerabilityPanel) {
            vulnerabilityPanel = new vulnerabilityPanel_1.VulnerabilityPanel(context.extensionUri, ragService);
        }
        vulnerabilityPanel.reveal();
    });
    // 注册右键菜单命令：分析选中的代码
    const analyzeSelectionCommand = vscode.commands.registerCommand('vulnerability-detector.analyzeSelectedCode', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('没有打开的编辑器');
            return;
        }
        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showErrorMessage('请先选择一段代码');
            return;
        }
        const selectedText = editor.document.getText(selection);
        const language = editor.document.languageId;
        // 打开面板并分析选中的代码
        if (!vulnerabilityPanel) {
            vulnerabilityPanel = new vulnerabilityPanel_1.VulnerabilityPanel(context.extensionUri, ragService);
        }
        vulnerabilityPanel.reveal();
        vulnerabilityPanel.analyzeCode(selectedText, language);
    });
    // 注册右键菜单命令
    context.subscriptions.push(vscode.commands.registerCommand('vulnerability-analyzer.analyzeSelectedCode', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('没有打开的编辑器');
            return;
        }
        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        if (!selectedText) {
            vscode.window.showErrorMessage('请先选择代码');
            return;
        }
        // 创建或显示漏洞分析面板
        const panel = vulnerabilityPanel_1.VulnerabilityPanel.createOrShow(context.extensionUri, ragService);
        // 设置代码并分析
        panel.setCodeAndAnalyze(selectedText);
    }));
    // 注册面板关闭时的处理
    if (vulnerabilityPanel) {
        context.subscriptions.push(vulnerabilityPanel.onDidDispose(() => {
            vulnerabilityPanel = undefined;
        }));
    }
    context.subscriptions.push(openPanelCommand, analyzeSelectionCommand);
}
exports.activate = activate;
function deactivate() {
    console.log('代码漏洞检测器已停用');
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map