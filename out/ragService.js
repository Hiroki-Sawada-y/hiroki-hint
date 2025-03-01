"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RagService = void 0;
// 在文件开头设置环境变量
process.env.OPENAI_API_BASE = "4.0.wokaai.com";
process.env.OPENAI_API_KEY = "sk-ThdennMumCFb63OCJT45vAYSfcV5qmjjIbGlXEDndEzrq9lc";
const vscode = require("vscode");
const axios_1 = require("axios");
const configManager_1 = require("./configManager");
class RagService {
    constructor() {
        this.initialized = true; // 直接设置为已初始化
        this.useExampleMode = false; // 修改为默认不使用示例模式
        this.cache = new Map(); // 明确缓存值类型
        this.cacheMaxSize = 50; // 缓存最大条目数
        this.cacheTimeout = 30 * 60 * 1000; // 缓存超时时间（30分钟）
        // 获取配置
        this.config = configManager_1.ConfigManager.getConfig();
        // 设置环境变量
        process.env.OPENAI_API_BASE = this.config.openaiApiBase;
        process.env.OPENAI_API_KEY = this.config.openaiApiKey;
        console.log('RAG服务已初始化，使用实际漏洞检测模式');
    }
    // 更新配置
    updateConfig(newConfig) {
        this.config = newConfig;
        // 更新环境变量
        process.env.OPENAI_API_BASE = this.config.openaiApiBase;
        process.env.OPENAI_API_KEY = this.config.openaiApiKey;
        console.log('RAG服务配置已更新');
    }
    // 切换示例模式
    toggleExampleMode(useExample) {
        this.useExampleMode = useExample;
        console.log(`已切换到${useExample ? '示例' : '实际'}漏洞模式`);
    }
    // 获取当前模式
    getExampleMode() {
        return this.useExampleMode;
    }
    /**
     * 生成缓存键
     * @param code 代码内容
     * @param language 代码语言
     * @returns 缓存键
     */
    generateCacheKey(code, language) {
        // 规范化代码，去除空白字符影响，并限制长度以避免过长的键
        const normalizedCode = code.trim();
        // 使用代码和语言的组合作为缓存键
        return `${language}:${normalizedCode.substring(0, 1000)}`;
    }
    /**
     * 从缓存中获取结果
     * @param code 代码内容
     * @param language 代码语言
     * @returns 缓存的结果，如果没有缓存则返回null
     */
    getCachedResult(code, language) {
        const cacheKey = this.generateCacheKey(code, language);
        const cachedItem = this.cache.get(cacheKey);
        if (cachedItem) {
            // 使用类型断言，先转为 unknown 再转为目标类型
            const { results, timestamp } = cachedItem;
            const now = Date.now();
            // 检查缓存是否过期
            if (now - timestamp < this.cacheTimeout) {
                console.log('使用缓存结果');
                return results;
            }
            else {
                // 缓存已过期，删除
                console.log('缓存已过期');
                this.cache.delete(cacheKey);
            }
        }
        return null;
    }
    /**
     * 将结果存入缓存
     * @param code 代码内容
     * @param language 代码语言
     * @param results 漏洞结果
     */
    cacheResult(code, language, results) {
        // 如果缓存已满，删除最旧的条目
        if (this.cache.size >= this.cacheMaxSize) {
            console.log('缓存已满，删除最旧条目');
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey !== undefined) {
                this.cache.delete(oldestKey);
            }
        }
        const cacheKey = this.generateCacheKey(code, language);
        this.cache.set(cacheKey, {
            results,
            timestamp: Date.now()
        });
        console.log(`结果已缓存`);
    }
    /**
     * 从代码中提取功能描述
     * @param code 代码内容
     * @returns 功能描述
     */
    async getFunctionalityFromCode(code) {
        console.log('正在提取代码功能描述...');
        const prompt = `Given the following vulnerability description, following the task:
1. Describe the functionality implemented in the given code. This should be answered under the section "Functionality:" and written in the imperative mood, e.g., "Calculate the price of a token." Your response should be concise and limited to one paragraph and within 80-100 words.
2. Remember, do not contain any variable or function or expression name in the Functionality Result, focus on the functionality or business logic itself

${code}`;
        console.log('发送LLM请求获取功能描述...');
        const response = await this.commonAsk(prompt);
        console.log(`提取的功能描述: ${response.substring(0, 100)}...`);
        return response;
    }
    /**
     * 调用LLM获取回答
     * @param prompt 提示词
     * @returns LLM的回答
     */
    async commonAsk(prompt) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            vscode.window.showErrorMessage('未设置OPENAI_API_KEY环境变量');
            return '';
        }
        const apiBase = process.env.OPENAI_API_BASE || 'api.openai.com';
        const model = process.env.AI_MODEL || 'gpt-4o';
        try {
            console.log(`正在调用LLM API (${apiBase})...`);
            const response = await axios_1.default.post(`https://${apiBase}/v1/chat/completions`, {
                model: model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('LLM响应成功');
            console.log(response.data.choices[0].message.content);
            return response.data.choices[0].message.content;
        }
        catch (error) {
            console.error('LLM请求错误:', error);
            return '';
        }
    }
    /**
     * 生成文本的嵌入向量
     * @param text 要嵌入的文本
     * @returns 嵌入向量
     */
    async generateEmbedding(text) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            vscode.window.showErrorMessage('未设置OPENAI_API_KEY环境变量');
            return [];
        }
        const apiBase = process.env.OPENAI_API_BASE || 'api.openai.com';
        const model = 'text-embedding-3-large';
        try {
            console.log('正在生成嵌入向量...');
            const response = await axios_1.default.post(`https://${apiBase}/v1/embeddings`, {
                input: text,
                model: model,
                encoding_format: "float"
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('嵌入向量生成成功');
            return response.data.data[0].embedding;
        }
        catch (error) {
            console.error('生成嵌入向量错误:', error);
            return [];
        }
    }
    /**
     * 查询Pinecone获取相似漏洞
     * @param embedding 嵌入向量
     * @param topK 返回结果数量
     * @returns 漏洞结果列表
     */
    async queryPinecone(embedding, topK = 10) {
        try {
            // 使用配置中的 Pinecone 信息
            const pineconeApiKey = this.config.pineconeApiKey;
            const pineconeHost = this.config.pineconeHost;
            const pineconeNamespace = this.config.pineconeNamespace;
            console.log(`正在查询Pinecone (${pineconeHost})...`);
            // 使用axios直接调用Pinecone API
            const response = await axios_1.default.post(`https://${pineconeHost}/query`, {
                vector: embedding,
                topK: topK,
                includeMetadata: true,
                includeValues: false,
                namespace: pineconeNamespace
            }, {
                headers: {
                    'Api-Key': pineconeApiKey,
                    'Content-Type': 'application/json'
                }
            });
            console.log('Pinecone查询成功');
            // 处理响应数据
            if (response.data && response.data.matches && response.data.matches.length > 0) {
                console.log(`找到 ${response.data.matches.length} 个匹配结果`);
                return response.data.matches.map((match) => {
                    console.log('处理匹配结果:', match.id);
                    return {
                        id: match.id,
                        title: match.metadata.Title || '未知漏洞',
                        severity: match.metadata.RiskLevel || 'medium',
                        description: match.metadata.Functionality || '无功能描述',
                        recommendation: match.metadata.KeyConcept || '无建议',
                        codeExample: match.metadata.CodeExample || '',
                        keyConcept: match.metadata.KeyConcept || '',
                        category: match.metadata.Category || '未分类',
                        similarityScore: match.score
                    };
                });
            }
            else {
                console.log('未找到匹配结果');
                return [];
            }
        }
        catch (error) {
            console.error('查询Pinecone错误:', error);
            return [];
        }
    }
    /**
     * 查询代码中的潜在漏洞
     * @param code 要检查的代码段
     * @param language 代码语言
     * @param threshold 匹配阈值
     * @param topK 返回top_k规则
     * @returns 漏洞结果列表
     */
    async queryVulnerabilities(code, language, threshold = 0.1, topK = 3) {
        try {
            console.log(`查询漏洞: ${language}`);
            // 检查缓存
            const cachedResults = this.getCachedResult(code, language);
            if (cachedResults) {
                return cachedResults;
            }
            console.log('缓存未命中');
            // 示例模式
            if (this.useExampleMode) {
                console.log('使用示例模式');
                const results = this.getExampleVulnerability(language);
                this.cacheResult(code, language, results);
                return results;
            }
            // 使用向量检索方式
            console.log('使用向量检索');
            // 1. 获取代码功能描述
            const functionality = await this.getFunctionalityFromCode(code);
            // 2. 将功能描述转换为嵌入向量
            const embedding = await this.generateEmbedding(functionality);
            if (embedding.length === 0) {
                console.error('生成嵌入向量失败');
                const results = this.getExampleVulnerability(language);
                this.cacheResult(code, language, results);
                return results;
            }
            // 3. 使用嵌入向量查询Pinecone获取相似漏洞
            const vulnerabilities = await this.queryPinecone(embedding, topK);
            if (vulnerabilities.length === 0) {
                console.log('未找到相关漏洞');
                const results = this.getExampleVulnerability(language);
                this.cacheResult(code, language, results);
                return results;
            }
            // 保存原始漏洞信息，用于后续翻译
            const originalVulnerabilities = [...vulnerabilities];
            // 4. 使用LLM进一步处理结果，传入选中的代码
            const results = await this.enhanceVulnerabilityResults(vulnerabilities, code);
            // 将结果存入缓存
            this.cacheResult(code, language, results);
            // 如果是增强后的结果（只有审计要点），则返回原始漏洞信息以便翻译
            if (results.length === 1 && results[0].auditPoints) {
                // 将原始漏洞信息附加到结果中，但不显示在UI上
                results[0].originalVulnerabilities = originalVulnerabilities;
            }
            return results;
        }
        catch (error) {
            console.error('查询漏洞失败:', error);
            vscode.window.showErrorMessage(`查询漏洞失败: ${error}`);
            return [];
        }
    }
    /**
     * 使用LLM增强漏洞结果
     * @param vulnerabilities 原始漏洞结果
     * @param selectedCode 用户选中的代码
     * @returns 增强后的漏洞结果
     */
    async enhanceVulnerabilityResults(vulnerabilities, selectedCode) {
        try {
            console.log('使用LLM增强漏洞结果...');
            // 准备所有漏洞的功能描述和关键概念的综合信息
            const vulnDescriptions = vulnerabilities.map((vuln, index) => {
                const functionality = vuln.description || '';
                const keyConcept = vuln.keyConcept || '';
                return `漏洞${index + 1}:
功能描述: ${functionality}
关键概念: ${keyConcept}`;
            }).join('\n\n');
            // 构建提示词 - 只生成一个综合的审计要点列表，限制为最多5个要点
            const prompt = `基于以下所有漏洞的功能描述和关键概念，生成一个综合的审计检查要点列表。
这些要点应该涵盖所有相关漏洞的检查内容。请用中文回答，简明扼要。

${vulnDescriptions}

代码片段:
\`\`\`
${selectedCode}
\`\`\`

请提供最多5个最重要的审计检查要点，每个要点都要与所选代码直接相关。格式如下：

## 代码审计要点

1. [第一个检查要点] - [简短解释]（解释中要包含具体代码）
2. [第二个检查要点] - [简短解释]（解释中要包含具体代码）
...

注意：要点应当简洁明了，重点突出，并按重要性排序。`;
            console.log('生成综合审计提示...');
            const auditPoints = await this.commonAsk(prompt);
            console.log('LLM返回的综合审计提示:', auditPoints);
            // 只返回一个包含审计要点的结果
            return [{
                    auditPoints: auditPoints
                }];
        }
        catch (error) {
            console.error('生成审计要点失败:', error);
            return [{
                    auditPoints: '未能生成审计要点'
                }];
        }
    }
    /**
     * 获取示例漏洞结果
     * @param language 代码语言
     * @returns 示例漏洞结果
     */
    getExampleVulnerability(language) {
        return [
            {
                id: 'example-vuln-1',
                title: '示例漏洞 - 输入验证不足',
                severity: 'high',
                description: '代码中可能存在输入验证不足的问题，可能导致注入攻击。',
                recommendation: '对所有用户输入进行严格验证和过滤，使用参数化查询防止SQL注入。',
                codeExample: '// 安全的做法\nconst query = "SELECT * FROM users WHERE id = ?";\ndb.execute(query, [userId]);',
                category: '输入验证',
                similarityScore: 0.95
            },
            {
                id: 'example-vuln-2',
                title: '示例漏洞 - 权限控制缺失',
                severity: 'medium',
                description: '代码可能缺少适当的权限控制，允许未授权访问敏感功能。',
                recommendation: '实现严格的访问控制机制，验证用户权限后再执行敏感操作。',
                category: '授权',
                similarityScore: 0.85
            },
            {
                id: 'example-vuln-3',
                title: '示例漏洞 - 敏感数据泄露',
                severity: 'medium',
                description: '代码可能在日志或错误消息中泄露敏感信息。',
                recommendation: '避免记录敏感数据，使用通用错误消息，不暴露内部实现细节。',
                category: '信息泄露',
                similarityScore: 0.75
            }
        ];
    }
    /**
     * 翻译漏洞的功能描述和关键概念
     * @param vulnerabilities 原始漏洞结果
     * @returns 翻译后的结果
     */
    async translateVulnerabilityInfo(vulnerabilities) {
        try {
            console.log('开始翻译漏洞信息...');
            // 准备所有漏洞的功能描述和关键概念
            const vulnDescriptions = vulnerabilities.map((vuln, index) => {
                const functionality = vuln.description || '';
                const keyConcept = vuln.keyConcept || '';
                return `漏洞${index + 1}:
功能描述(Functionality): ${functionality}
关键概念(KeyConcept): ${keyConcept}`;
            }).join('\n\n');
            // 构建翻译提示词
            const prompt = `将以下漏洞的功能描述和关键概念翻译成中文：

${vulnDescriptions}

优化下翻译后的结构，输出优化结构后的翻译结果。`;
            console.log('发送翻译请求...');
            const translatedText = await this.commonAsk(prompt);
            console.log('翻译完成');
            return translatedText;
        }
        catch (error) {
            console.error('翻译漏洞信息失败:', error);
            return '翻译失败，请稍后再试';
        }
    }
}
exports.RagService = RagService;
//# sourceMappingURL=ragService.js.map