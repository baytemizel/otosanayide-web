// Decimal user input without floating point conversion or ambiguous thousands separators.
export function decimalHundredths(value:string){const match=/^(\d{1,7})(?:[.,](\d{1,2}))?$/.exec(value.trim());if(!match)return null;return Number(match[1])*100+Number((match[2]??'').padEnd(2,'0'));}
