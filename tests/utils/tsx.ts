import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { execaNode } from 'execa';
import getNode from 'get-node';

type Options = {
	args: string[];
	nodePath?: string;
	cwd?: string;
};

const __dirname = fileURLToPath(import.meta.url);
export const tsxPath = path.join(__dirname, '../../../dist/cli.js');

export const tsx = (
	options: Options,
) => execaNode(
	tsxPath,
	options.args,
	{
		env: {
			NODE_OPTIONS: '--max_old_space_size=4096',
			ESBK_DISABLE_CACHE: '1',
		},
		nodePath: options.nodePath,
		nodeOptions: [],
		cwd: options.cwd,
		reject: false,
		all: true,
	},
);

export async function createNode(
	nodeVersion: string,
	fixturePath: string,
) {
	const node = await getNode(nodeVersion);

	return {
		version: node.version,
		packageType: '',
		get isCJS() {
			return this.packageType === 'commonjs';
		},
		tsx(
			options: Options,
		) {
			return tsx({
				...options,
				nodePath: node.path,
			});
		},
		load(
			filePath: string,
			options?: {
				cwd?: string;
				args?: string[];
			},
		) {
			return this.tsx(
				{
					args: [
						...(options?.args ?? []),
						filePath,
					],
					cwd: path.join(fixturePath, options?.cwd ?? ''),
				},
			);
		},
		import(
			filePath: string,
			options?: {
				typescript?: boolean;
			},
		) {
			return this.tsx({
				args: [
					`./import-file${options?.typescript ? '.ts' : '.js'}`,
					filePath,
				],
				cwd: fixturePath,
			});
		},
		require(
			filePath: string,
			options?: {
				typescript?: boolean;
			},
		) {
			return this.tsx({
				args: [
					`./require-file${options?.typescript ? '.cts' : '.cjs'}`,
					filePath,
				],
				cwd: fixturePath,
			});
		},
		requireFlag(
			filePath: string,
		) {
			return this.tsx({
				args: [
					'--eval',
					'null',
					'--require',
					filePath,
				],
				cwd: fixturePath,
			});
		},

		loadFile(
			cwd: string,
			filePath: string,
			options?: {
				args?: string[];
			},
		) {
			return this.tsx(
				{
					args: [
						...(options?.args ?? []),
						filePath,
					],
					cwd,
				},
			);
		},

		async importFile(
			cwd: string,
			importFrom: string,
			fileExtension = '.mjs',
		) {
			const fileName = `_${Math.random().toString(36).slice(2)}${fileExtension}`;
			const filePath = path.resolve(cwd, fileName);
			await fs.writeFile(filePath, `import * as _ from '${importFrom}';console.log(_)`);
			try {
				return await this.loadFile(cwd, filePath);
			} finally {
				await fs.rm(filePath);
			}
		},

		async requireFile(
			cwd: string,
			requireFrom: string,
			fileExtension = '.cjs',
		) {
			const fileName = `_${Math.random().toString(36).slice(2)}${fileExtension}`;
			const filePath = path.resolve(cwd, fileName);
			await fs.writeFile(filePath, `const _ = require('${requireFrom}');console.log(_)`);
			try {
				return await this.loadFile(cwd, filePath);
			} finally {
				await fs.rm(filePath);
			}
		},
	};
}

export type NodeApis = Awaited<ReturnType<typeof createNode>>;
