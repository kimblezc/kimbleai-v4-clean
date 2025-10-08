// Check for whitespace in the API key
const key = 'b33ccce950894067b89588381d61cddb';

console.log('Key analysis:');
console.log('Length:', key.length);
console.log('Expected:', 32);
console.log('Has leading space:', key !== key.trimStart());
console.log('Has trailing space:', key !== key.trimEnd());
console.log('Has any whitespace:', /\s/.test(key));
console.log('First char code:', key.charCodeAt(0));
console.log('Last char code:', key.charCodeAt(key.length - 1));
console.log('All char codes:', [...key].map((c, i) => `${i}:${c}(${c.charCodeAt(0)})`).join(' '));

if (key.length === 32 && key === key.trim() && !/\s/.test(key)) {
  console.log('\n✅ Key is clean - no whitespace issues');
} else {
  console.log('\n❌ Key has whitespace or length issues');
  console.log('Trimmed key:', key.trim());
  console.log('Trimmed length:', key.trim().length);
}
