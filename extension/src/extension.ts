import { ExtensionContext, commands, window, workspace } from "vscode";
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
} from "vscode-languageclient/node";
import { showReferences } from "./commands";

let client: LanguageClient | undefined;

async function startLanguageClient(context: ExtensionContext) {
	try {
		const executablePath = (() => {
			let executablePath = workspace
				.getConfiguration("pylyzer")
				.get<string>("executablePath", "");
			return executablePath === "" ? "pylyzer" : executablePath;
		})();
		const enableInlayHints = workspace.getConfiguration("pylyzer").get<boolean>("inlayHints", false);
		const enableSemanticTokens = workspace.getConfiguration("pylyzer").get<boolean>("semanticTokens", true);
		const enableHover = workspace.getConfiguration("pylyzer").get<boolean>("hover", true);
		const smartCompletion = workspace.getConfiguration("pylyzer").get<boolean>("smartCompletion", true);
		/* optional features */
		const checkOnType = workspace.getConfiguration("pylyzer").get<boolean>("checkOnType", false);
		let args = ["--server"];
		if (!(enableInlayHints && enableSemanticTokens && enableHover && smartCompletion) || checkOnType) {
			args.push("--");
		}
		if (!enableInlayHints) {
			args.push("--disable");
			args.push("inlayHints");
		}
		if (!enableSemanticTokens) {
			args.push("--disable");
			args.push("semanticTokens");
		}
		if (!enableHover) {
			args.push("--disable");
			args.push("hover");
		}
		if (!smartCompletion) {
			args.push("--disable");
			args.push("smartCompletion");
		}
		if (checkOnType) {
			args.push("--enable");
			args.push("checkOnType");
		}
		let serverOptions: ServerOptions = {
			command: executablePath,
			args,
		};
		const clientOptions: LanguageClientOptions = {
			documentSelector: [
				{
					scheme: "file",
					language: "python",
				},
			],
		};
		client = new LanguageClient("pylyzer", serverOptions, clientOptions);
		await client.start();
	} catch (e) {
		window.showErrorMessage(
			"Failed to start the pylyzer language server. Please make sure you have pylyzer installed.",
		);
	}
}

async function restartLanguageClient() {
	try {
		if (client === undefined) {
			throw new Error();
		}
		await client.restart();
	} catch (e) {
		window.showErrorMessage("Failed to restart the pylyzer language server.");
	}
}

export async function activate(context: ExtensionContext) {
	context.subscriptions.push(
		commands.registerCommand("pylyzer.restartLanguageServer", () => restartLanguageClient())
	);
	context.subscriptions.push(
		commands.registerCommand("pylyzer.showReferences", async (uri, position, locations) => {
			await showReferences(client, uri, position, locations)
		})
	);
	await startLanguageClient(context);
}

export function deactivate() {
	if (client) {
		return client.stop();
	}
}
