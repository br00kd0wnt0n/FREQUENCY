const MORSE_CODE: Record<string, string> = {
  'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
  'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
  'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
  'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
  'Y': '-.--', 'Z': '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--', '/': '-..-.',
  ' ': ' '
};

// Timing units (in milliseconds at standard speed)
const DOT_DURATION = 100;
const DASH_DURATION = DOT_DURATION * 3;
const INTRA_CHAR_GAP = DOT_DURATION;
const INTER_CHAR_GAP = DOT_DURATION * 3;
const WORD_GAP = DOT_DURATION * 7;

export class MorseEncoder {
  encode(text: string): string {
    return text
      .toUpperCase()
      .split('')
      .map(char => MORSE_CODE[char] || '')
      .filter(code => code !== '')
      .join(' ');
  }

  decode(morse: string): string {
    const reverseMorse = Object.entries(MORSE_CODE).reduce((acc, [char, code]) => {
      acc[code] = char;
      return acc;
    }, {} as Record<string, string>);

    return morse
      .split('   ') // Words separated by 3 spaces
      .map(word =>
        word
          .split(' ')
          .map(code => reverseMorse[code] || '')
          .join('')
      )
      .join(' ');
  }

  getTimings(encoded: string): number[] {
    const timings: number[] = [];

    for (let i = 0; i < encoded.length; i++) {
      const char = encoded[i];
      const nextChar = encoded[i + 1];

      if (char === '.') {
        timings.push(DOT_DURATION);
      } else if (char === '-') {
        timings.push(DASH_DURATION);
      } else if (char === ' ') {
        // Check if it's a word gap (multiple spaces) or inter-character gap
        if (encoded[i - 1] === ' ' || nextChar === ' ') {
          continue; // Part of word gap, handled elsewhere
        }
        timings.push(INTER_CHAR_GAP);
      }

      // Add intra-character gap after dots and dashes (if not at word boundary)
      if ((char === '.' || char === '-') && nextChar && nextChar !== ' ') {
        timings.push(-INTRA_CHAR_GAP); // Negative indicates silence
      }
    }

    return timings;
  }

  getTotalDuration(text: string): number {
    const encoded = this.encode(text);
    const timings = this.getTimings(encoded);
    return timings.reduce((sum, t) => sum + Math.abs(t), 0);
  }
}
