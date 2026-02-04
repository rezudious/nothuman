// Helper functions
export function isPrime(n: number): boolean {
	if (n < 2) return false;
	if (n === 2) return true;
	if (n % 2 === 0) return false;
	for (let i = 3; i <= Math.sqrt(n); i += 2) {
		if (n % i === 0) return false;
	}
	return true;
}

export function isEven(n: number): boolean {
	return n % 2 === 0;
}

export function isOdd(n: number): boolean {
	return n % 2 !== 0;
}

export function isFibonacci(n: number): boolean {
	// A number is Fibonacci if 5n^2 + 4 or 5n^2 - 4 is a perfect square
	const check1 = 5 * n * n + 4;
	const check2 = 5 * n * n - 4;
	const sqrt1 = Math.sqrt(check1);
	const sqrt2 = Math.sqrt(check2);
	return sqrt1 === Math.floor(sqrt1) || sqrt2 === Math.floor(sqrt2);
}

// Month data
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;

function getDaysInMonth(month: number, year: number): number {
	// month is 0-indexed (0 = jan, 1 = feb, etc.)
	const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

	// Check for leap year in February
	if (month === 1) {
		const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
		return isLeapYear ? 29 : 28;
	}

	return daysInMonth[month];
}

// Property types
type PropertyName = 'isPrime' | 'isEven' | 'isOdd' | 'isFibonacci';

const propertyFunctions: Record<PropertyName, (n: number) => boolean> = {
	isPrime,
	isEven,
	isOdd,
	isFibonacci,
};

const ALL_PROPERTIES: PropertyName[] = ['isPrime', 'isEven', 'isOdd', 'isFibonacci'];

// Day object type
interface DayObject {
	day: number;
	[key: string]: number | boolean;
}

// Calendar type
type Calendar = {
	[K in (typeof MONTHS)[number]]: DayObject[];
};

interface StructuredJsonResult {
	calendar: Calendar;
	checksum: number;
}

export interface StructuredJsonParameters {
	year: number;
	properties: PropertyName[];
	[key: string]: unknown;
}

export interface StructuredJsonChallengeResult {
	prompt: string;
	expectedAnswer: string;
	parameters: StructuredJsonParameters;
}

function generateCalendar(year: number, properties: PropertyName[]): { calendar: Calendar; primeCount: number } {
	const calendar: Partial<Calendar> = {};
	let primeCount = 0;

	for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
		const monthName = MONTHS[monthIdx];
		const daysInMonth = getDaysInMonth(monthIdx, year);
		const days: DayObject[] = [];

		for (let day = 1; day <= daysInMonth; day++) {
			const dayObj: DayObject = { day };

			for (const prop of properties) {
				dayObj[prop] = propertyFunctions[prop](day);
			}

			// Count primes for checksum
			if (isPrime(day)) {
				primeCount++;
			}

			days.push(dayObj);
		}

		calendar[monthName] = days;
	}

	return { calendar: calendar as Calendar, primeCount };
}

function computeChecksum(primeCount: number, nonce: string): number {
	const nonceValue = parseInt(nonce.slice(0, 4), 16);
	return (primeCount * nonceValue) % 100000;
}

export function generateStructuredJsonChallenge(nonce: string): StructuredJsonChallengeResult {
	// Random year between 2020-2030
	const year = 2020 + Math.floor(Math.random() * 11);

	// Pick 2 random properties
	const shuffled = [...ALL_PROPERTIES].sort(() => Math.random() - 0.5);
	const properties = shuffled.slice(0, 2) as PropertyName[];

	// Generate calendar and count primes
	const { calendar, primeCount } = generateCalendar(year, properties);

	// Compute checksum with nonce
	const checksum = computeChecksum(primeCount, nonce);

	// Build expected answer
	const expectedResult: StructuredJsonResult = {
		calendar,
		checksum,
	};
	const expectedAnswer = JSON.stringify(expectedResult);

	// Build prompt
	const nonceHex = `0x${nonce.slice(0, 4)}`;
	const prompt = `Challenge nonce: ${nonce}

Generate a JSON calendar object for the year ${year}.

Structure:
- 12 month keys: "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"
- Each month contains an array of day objects
- Each day object has:
  - "day": the day number (1-based)
  - "${properties[0]}": boolean indicating if the day number ${properties[0].replace('is', 'is ').toLowerCase()}
  - "${properties[1]}": boolean indicating if the day number ${properties[1].replace('is', 'is ').toLowerCase()}

Return format:
{
  "calendar": { "jan": [...], "feb": [...], ... },
  "checksum": <number>
}

Checksum formula: (total count of prime day numbers across all months * ${nonceHex}) % 100000

Note: A day number is prime if it's only divisible by 1 and itself. Prime days in a month are: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31.`;

	return {
		prompt,
		expectedAnswer,
		parameters: { year, properties },
	};
}

export function validateStructuredJson(answer: string, expectedAnswer: string): boolean {
	try {
		const submitted = JSON.parse(answer) as StructuredJsonResult;
		const expected = JSON.parse(expectedAnswer) as StructuredJsonResult;

		// Check checksum matches
		if (submitted.checksum !== expected.checksum) {
			return false;
		}

		// Check calendar structure
		for (const month of MONTHS) {
			if (!submitted.calendar[month] || !Array.isArray(submitted.calendar[month])) {
				return false;
			}

			const submittedDays = submitted.calendar[month];
			const expectedDays = expected.calendar[month];

			if (submittedDays.length !== expectedDays.length) {
				return false;
			}

			for (let i = 0; i < expectedDays.length; i++) {
				const subDay = submittedDays[i];
				const expDay = expectedDays[i];

				if (subDay.day !== expDay.day) {
					return false;
				}

				// Check all properties match
				for (const key of Object.keys(expDay)) {
					if (subDay[key] !== expDay[key]) {
						return false;
					}
				}
			}
		}

		return true;
	} catch {
		return false;
	}
}
