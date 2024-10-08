
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 通配符匹配函数
 * @param pattern 通配符模式
 * @param str 要匹配的字符串
 * @returns 是否匹配成功
 */
export function wildcardMatch(pattern: string, str: string): boolean {
    // 将通配符模式转换为正则表达式
    const regexPattern: string = pattern
        .split(/\*+/)
        .map(segment => segment
            .split(/\?/)
            .map(escapeRegex)
            .join('.')
        )
        .join('.*');

    // 创建正则表达式对象
    const regex: RegExp = new RegExp(`^${regexPattern}$`);

    // 测试字符串是否匹配
    return regex.test(str);
}