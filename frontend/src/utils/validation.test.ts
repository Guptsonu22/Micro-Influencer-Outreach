/**
 * Unit tests for frontend validation utilities.
 * Compatible with Node.js built-in test runner or Vitest / Jest.
 */

import {
  isValidEmail,
  countWords,
  isEmailWordCountValid,
  isDmWordCountValid,
  isMicroInfluencerTier,
  formatMetric,
} from './validation';

export function runValidationTests(): { passed: number; failed: number; results: string[] } {
  let passed = 0;
  let failed = 0;
  const results: string[] = [];

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
      results.push(`PASS: ${testName}`);
    } else {
      failed++;
      results.push(`FAIL: ${testName}`);
    }
  }

  // 1. Email validation tests
  assert(isValidEmail('creator@techchannel.com'), 'Valid business email passes');
  assert(!isValidEmail('Not Found'), 'Not Found is rejected as invalid email');
  assert(!isValidEmail(''), 'Empty string is rejected as invalid email');
  assert(!isValidEmail('not-an-email'), 'Malformed email string is rejected');

  // 2. Word count tests
  assert(countWords('This is a test of five words.') === 7, 'Accurate word count for normal sentence');
  assert(countWords('   ') === 0, 'Whitespace-only returns 0 words');

  // 3. Email word count boundary tests (60-90 words)
  const fiftyWords = new Array(50).fill('word').join(' ');
  const seventyWords = new Array(70).fill('word').join(' ');
  const ninetyFiveWords = new Array(95).fill('word').join(' ');

  assert(!isEmailWordCountValid(fiftyWords), 'Under 60 words email rejected');
  assert(isEmailWordCountValid(seventyWords), '70 words email accepted (within 60-90)');
  assert(!isEmailWordCountValid(ninetyFiveWords), 'Over 90 words email rejected');

  // 4. Instagram DM word count boundary tests (15-30 words)
  const tenWords = new Array(10).fill('word').join(' ');
  const twentyWords = new Array(20).fill('word').join(' ');
  const thirtyFiveWords = new Array(35).fill('word').join(' ');

  assert(!isDmWordCountValid(tenWords), 'Under 15 words DM rejected');
  assert(isDmWordCountValid(twentyWords), '20 words DM accepted (within 15-30)');
  assert(!isDmWordCountValid(thirtyFiveWords), 'Over 30 words DM rejected');

  // 5. Micro-influencer subscriber tier tests (5k - 100k)
  assert(isMicroInfluencerTier(5000), '5,000 subscribers qualifies as micro-influencer');
  assert(isMicroInfluencerTier(50000), '50,000 subscribers qualifies as micro-influencer');
  assert(isMicroInfluencerTier(100000), '100,000 subscribers qualifies as micro-influencer');
  assert(!isMicroInfluencerTier(4999), '4,999 subscribers rejected (too small)');
  assert(!isMicroInfluencerTier(100001), '100,001 subscribers rejected (macro influencer)');
  assert(!isMicroInfluencerTier(null), 'Null subscribers rejected (hidden count)');

  // 6. Metric formatter tests
  assert(formatMetric(null) === 'Unavailable', 'Missing metric distinguished as Unavailable');
  assert(formatMetric(undefined) === 'Unavailable', 'Undefined metric distinguished as Unavailable');
  assert(formatMetric(0, '%') === '0%', '0% metric accurately preserved without turning into Unavailable');
  assert(formatMetric(25000) === '25,000', 'Formatted number with comma thousands separator');

  return { passed, failed, results };
}

// Auto-run if executed directly in node
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('validation.test')) {
  const summary = runValidationTests();
  console.log(`Test Run Complete: ${summary.passed} passed, ${summary.failed} failed.`);
  if (summary.failed > 0) {
    process.exit(1);
  }
}
