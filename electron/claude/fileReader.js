"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readFileContent = readFileContent;
exports.writeFileContent = writeFileContent;
exports.listDirectory = listDirectory;
exports.readClaudeConfig = readClaudeConfig;
exports.readPlanFile = readPlanFile;
// electron/claude/fileReader.ts
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
async function readFileContent(filePath) {
    return (0, promises_1.readFile)(filePath, 'utf-8');
}
async function writeFileContent(filePath, content) {
    await (0, promises_1.writeFile)(filePath, content, 'utf-8');
}
async function listDirectory(dirPath) {
    const entries = await (0, promises_1.readdir)(dirPath, { withFileTypes: true });
    const results = [];
    for (const entry of entries) {
        const fullPath = path_1.default.join(dirPath, entry.name);
        const stats = await (0, promises_1.stat)(fullPath);
        results.push({
            name: entry.name,
            path: fullPath,
            isDirectory: entry.isDirectory(),
            size: stats.size,
            modified: stats.mtime,
        });
    }
    return results.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) {
            return a.isDirectory ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
    });
}
async function readClaudeConfig(projectPath) {
    try {
        const configPath = path_1.default.join(projectPath, '.claude', 'settings.json');
        const content = await (0, promises_1.readFile)(configPath, 'utf-8');
        return JSON.parse(content);
    }
    catch {
        return null;
    }
}
async function readPlanFile(projectPath) {
    try {
        const planPath = path_1.default.join(projectPath, '.claude', 'plan.md');
        return await (0, promises_1.readFile)(planPath, 'utf-8');
    }
    catch {
        return null;
    }
}
