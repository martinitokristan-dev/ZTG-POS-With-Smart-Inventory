/**
 * numberToWords.js
 * Converts numeric amounts to formal English currency words for BIR Collection Receipts.
 * e.g., 4600.00 -> "FOUR THOUSAND SIX HUNDRED PESOS ONLY"
 * e.g., 1250.75 -> "ONE THOUSAND TWO HUNDRED FIFTY PESOS AND 75/100 ONLY"
 */

const ONES = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN',
    'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];

const TENS = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

function convertChunk(num) {
    let str = '';
    if (num >= 100) {
        str += ONES[Math.floor(num / 100)] + ' HUNDRED ';
        num %= 100;
    }
    if (num >= 20) {
        str += TENS[Math.floor(num / 10)] + ' ';
        num %= 10;
    }
    if (num > 0) {
        str += ONES[num] + ' ';
    }
    return str.trim();
}

export function numberToWordsPesos(amount) {
    const num = parseFloat(amount);
    if (isNaN(num) || num === 0) return 'ZERO PESOS ONLY';

    const rounded = Math.abs(num);
    const whole = Math.floor(rounded);
    const cents = Math.round((rounded - whole) * 100);

    if (whole === 0 && cents > 0) {
        return `${cents}/100 CENTAVOS ONLY`;
    }

    const billions = Math.floor(whole / 1000000000);
    const millions = Math.floor((whole % 1000000000) / 1000000);
    const thousands = Math.floor((whole % 1000000) / 1000);
    const remainder = whole % 1000;

    let result = '';

    if (billions > 0) {
        result += convertChunk(billions) + ' BILLION ';
    }
    if (millions > 0) {
        result += convertChunk(millions) + ' MILLION ';
    }
    if (thousands > 0) {
        result += convertChunk(thousands) + ' THOUSAND ';
    }
    if (remainder > 0) {
        result += convertChunk(remainder) + ' ';
    }

    result = result.trim() + ' PESOS';

    if (cents > 0) {
        result += ` AND ${cents}/100`;
    } else {
        result += ' ONLY';
    }

    return result;
}
