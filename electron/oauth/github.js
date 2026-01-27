"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGitHubConfig = getGitHubConfig;
exports.startGitHubOAuth = startGitHubOAuth;
exports.handleGitHubCallback = handleGitHubCallback;
exports.isGitHubOAuthConfigured = isGitHubOAuthConfigured;
// electron/oauth/github.ts
const electron_1 = require("electron");
const https_1 = __importDefault(require("https"));
const url_1 = require("url");
// Store for pending OAuth callbacks
let pendingCallback = null;
// Get GitHub OAuth config from environment
function getGitHubConfig() {
    const clientId = process.env.VITE_GITHUB_CLIENT_ID;
    const clientSecret = process.env.VITE_GITHUB_CLIENT_SECRET;
    console.log('[GitHub OAuth] Checking config:', {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        clientIdPrefix: clientId?.substring(0, 8),
    });
    if (!clientId || !clientSecret) {
        console.log('[GitHub OAuth] Missing credentials!');
        return null;
    }
    return {
        clientId,
        clientSecret,
        redirectUri: 'vibes://oauth/github/callback',
        scope: 'repo,user',
    };
}
// Start GitHub OAuth flow
function startGitHubOAuth(callback) {
    const config = getGitHubConfig();
    if (!config) {
        callback({
            success: false,
            error: 'GitHub OAuth not configured. Set VITE_GITHUB_CLIENT_ID and VITE_GITHUB_CLIENT_SECRET.',
        });
        return false;
    }
    pendingCallback = callback;
    const authUrl = new url_1.URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.set('client_id', config.clientId);
    authUrl.searchParams.set('redirect_uri', config.redirectUri);
    authUrl.searchParams.set('scope', config.scope);
    authUrl.searchParams.set('state', generateState());
    electron_1.shell.openExternal(authUrl.toString());
    return true;
}
// Handle OAuth callback from vibes:// protocol
async function handleGitHubCallback(url, mainWindow) {
    const callback = pendingCallback;
    pendingCallback = null;
    if (!callback) {
        console.error('[GitHub OAuth] No pending callback for OAuth');
        return;
    }
    try {
        const parsedUrl = new url_1.URL(url);
        const code = parsedUrl.searchParams.get('code');
        const error = parsedUrl.searchParams.get('error');
        const errorDescription = parsedUrl.searchParams.get('error_description');
        if (error) {
            callback({
                success: false,
                error: errorDescription || error,
            });
            return;
        }
        if (!code) {
            callback({
                success: false,
                error: 'No authorization code received',
            });
            return;
        }
        // Exchange code for access token
        const config = getGitHubConfig();
        if (!config) {
            callback({
                success: false,
                error: 'GitHub OAuth configuration lost',
            });
            return;
        }
        const tokenResult = await exchangeCodeForToken(code, config);
        if (!tokenResult.success) {
            callback(tokenResult);
            return;
        }
        // Get user info
        const userResult = await getGitHubUser(tokenResult.accessToken);
        if (userResult.username) {
            tokenResult.username = userResult.username;
        }
        callback(tokenResult);
        // Focus main window after successful auth
        if (mainWindow) {
            mainWindow.focus();
        }
    }
    catch (err) {
        callback({
            success: false,
            error: err instanceof Error ? err.message : String(err),
        });
    }
}
// Exchange authorization code for access token
async function exchangeCodeForToken(code, config) {
    return new Promise((resolve) => {
        const postData = JSON.stringify({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code,
            redirect_uri: config.redirectUri,
        });
        const options = {
            hostname: 'github.com',
            path: '/login/oauth/access_token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'Accept': 'application/json',
            },
        };
        const req = https_1.default.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.error) {
                        resolve({
                            success: false,
                            error: result.error_description || result.error,
                        });
                    }
                    else {
                        resolve({
                            success: true,
                            accessToken: result.access_token,
                            tokenType: result.token_type,
                            scope: result.scope,
                        });
                    }
                }
                catch {
                    resolve({
                        success: false,
                        error: 'Failed to parse token response',
                    });
                }
            });
        });
        req.on('error', (err) => {
            resolve({
                success: false,
                error: err.message,
            });
        });
        req.write(postData);
        req.end();
    });
}
// Get GitHub user info
async function getGitHubUser(accessToken) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'api.github.com',
            path: '/user',
            method: 'GET',
            headers: {
                'Authorization': `token ${accessToken}`,
                'User-Agent': 'vibes-app',
                'Accept': 'application/json',
            },
        };
        const req = https_1.default.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    const user = JSON.parse(data);
                    resolve({ username: user.login });
                }
                catch {
                    resolve({ error: 'Failed to parse user response' });
                }
            });
        });
        req.on('error', (err) => {
            resolve({ error: err.message });
        });
        req.end();
    });
}
// Generate random state for OAuth
function generateState() {
    return Math.random().toString(36).substring(2, 15);
}
// Check if OAuth is configured
function isGitHubOAuthConfigured() {
    return getGitHubConfig() !== null;
}
