export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
	timestamp: string;
	level: LogLevel;
	message: string;
	[key: string]: unknown;
}

export function log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
	const entry: LogEntry = {
		timestamp: new Date().toISOString(),
		level,
		message,
		...data,
	};

	const output = JSON.stringify(entry);

	switch (level) {
		case 'error':
			console.error(output);
			break;
		case 'warn':
			console.warn(output);
			break;
		case 'debug':
			console.debug(output);
			break;
		default:
			console.log(output);
	}
}

// Convenience methods
export const logger = {
	debug: (message: string, data?: Record<string, unknown>) => log('debug', message, data),
	info: (message: string, data?: Record<string, unknown>) => log('info', message, data),
	warn: (message: string, data?: Record<string, unknown>) => log('warn', message, data),
	error: (message: string, data?: Record<string, unknown>) => log('error', message, data),
};
