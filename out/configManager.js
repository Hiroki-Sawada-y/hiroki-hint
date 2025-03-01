"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
const vscode = require("vscode");
class ConfigManager {
    // 获取配置
    static getConfig() {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        return {
            openaiApiBase: config.get('openaiApiBase') || this.DEFAULT_CONFIG.openaiApiBase,
            openaiApiKey: config.get('openaiApiKey') || this.DEFAULT_CONFIG.openaiApiKey,
            pineconeApiKey: this.DEFAULT_CONFIG.pineconeApiKey,
            pineconeHost: this.DEFAULT_CONFIG.pineconeHost,
            pineconeNamespace: this.DEFAULT_CONFIG.pineconeNamespace
        };
    }
    // 更新配置
    static async updateConfig(newConfig) {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        for (const [key, value] of Object.entries(newConfig)) {
            if (value !== undefined) {
                await config.update(key, value, vscode.ConfigurationTarget.Global);
            }
        }
    }
    // 打开配置界面
    static async showConfigurationUI() {
        const currentConfig = this.getConfig();
        // 询问用户是使用默认配置还是自定义配置
        const configChoice = await vscode.window.showQuickPick([
            { label: '使用默认配置', description: '使用内置的API配置' },
            { label: '自定义配置', description: '设置自己的OpenAI API配置' }
        ], { placeHolder: '请选择配置方式' });
        if (!configChoice)
            return; // 用户取消
        if (configChoice.label === '使用默认配置') {
            // 使用默认配置
            await this.updateConfig({
                openaiApiBase: this.DEFAULT_CONFIG.openaiApiBase,
                openaiApiKey: this.DEFAULT_CONFIG.openaiApiKey
            });
            // 设置环境变量
            process.env.OPENAI_API_BASE = this.DEFAULT_CONFIG.openaiApiBase;
            process.env.OPENAI_API_KEY = this.DEFAULT_CONFIG.openaiApiKey;
            vscode.window.showInformationMessage('已恢复默认配置');
            return;
        }
        // 获取OpenAI API Base
        const openaiApiBase = await vscode.window.showInputBox({
            prompt: 'OpenAI API 基础URL',
            value: currentConfig.openaiApiBase,
            placeHolder: '例如: 4.0.wokaai.com 或 api.openai.com'
        });
        if (openaiApiBase === undefined)
            return; // 用户取消
        // 获取OpenAI API Key
        const openaiApiKey = await vscode.window.showInputBox({
            prompt: 'OpenAI API 密钥',
            value: currentConfig.openaiApiKey,
            placeHolder: '以sk-开头的API密钥',
            password: true
        });
        if (openaiApiKey === undefined)
            return; // 用户取消
        // 更新配置
        await this.updateConfig({
            openaiApiBase,
            openaiApiKey
        });
        // 设置环境变量
        process.env.OPENAI_API_BASE = openaiApiBase;
        process.env.OPENAI_API_KEY = openaiApiKey;
        vscode.window.showInformationMessage('配置已更新');
    }
}
exports.ConfigManager = ConfigManager;
ConfigManager.CONFIG_SECTION = 'codeAuditHinter';
ConfigManager.DEFAULT_CONFIG = {
    openaiApiBase: '4.0.wokaai.com',
    openaiApiKey: 'sk-ThdennMumCFb63OCJT45vAYSfcV5qmjjIbGlXEDndEzrq9lc',
    pineconeApiKey: 'pcsk_7USFmg_PGvHJanFiMm6rJi3QLzLV2uk95rNh64pSBEZvMSZUmtRXX6joajxRxrTnw8egcD',
    pineconeHost: 'soloditvuls-5d34b50.svc.aped-4627-b74a.pinecone.io',
    pineconeNamespace: 'vulns_high'
};
//# sourceMappingURL=configManager.js.map