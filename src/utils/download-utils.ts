import {
	createCipheriv,
	createHash,
	pbkdf2Sync,
	randomBytes,
} from "node:crypto";

/**
 * 下载按钮的构建期工具函数
 *
 * 与 rehype-component-download.mjs（正文 ::download 指令）共用。
 */

/** 密钥派生参数，必须与前端 DownloadSupport.astro 中的保持一致 */
export const PBKDF2_ITERATIONS = 100000;
export const PBKDF2_HASH = "sha256";
export const SALT_BYTES = 16;
export const IV_BYTES = 12;
export const TAG_BYTES = 16;

/**
 * 计算下载密码的 SHA-256 十六进制哈希。
 *
 * 前端提交密码后用 WebCrypto 计算同样的哈希再比对，
 * 明文密码不会出现在任何输出文件中。
 */
export function hashDownloadPassword(password: string): string {
	return createHash("sha256").update(password, "utf8").digest("hex");
}

/**
 * 把真实下载地址编码为 Base64，避免明文出现在 HTML 里。
 *
 * 混淆目的：查看源码 / F12 Elements 中搜不到真实地址。
 * 注意这只是混淆不是加密——点击下载的瞬间，Network 面板仍能看到真实请求。
 *
 * 仅用于**没有设置访问密码**的下载（没有密码就没有密钥来源，
 * 地址无法真正隐藏，只能做到「不一眼看出」）。
 */
export function encodeDownloadUrl(url: string): string {
	return Buffer.from(url, "utf8").toString("base64");
}

/**
 * 用访问密码派生的密钥加密下载地址（AES-256-GCM）。
 *
 * 密钥 = PBKDF2(password, salt)，只有用户输入正确密码后前端才能派生出来并解密，
 * 因此**页面源码 / RSS / 接口里都不会出现地址**，连 Base64 都不是。
 *
 * 输出格式：base64( salt(16) | iv(12) | tag(16) | ciphertext )
 */
export function encryptDownloadUrl(url: string, password: string): string {
	const salt = randomBytes(SALT_BYTES);
	const iv = randomBytes(IV_BYTES);
	const key = pbkdf2Sync(
		password,
		salt,
		PBKDF2_ITERATIONS,
		32,
		PBKDF2_HASH,
	);

	const cipher = createCipheriv("aes-256-gcm", key, iv);
	const ciphertext = Buffer.concat([
		cipher.update(url, "utf8"),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();

	return Buffer.concat([salt, iv, tag, ciphertext]).toString("base64");
}
