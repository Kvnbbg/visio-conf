/**
 * Returns true when the list is strictly increasing, then strictly decreasing,
 * then strictly increasing again (each phase must have at least one step).
 *
 * @param {number[]} nums
 * @returns {boolean}
 */
export function isTrionic(nums) {
  const n = nums.length;
  if (n < 3) {
    return false;
  }

  let p = 0;

  // Phase 1: strictly increasing
  while (p < n - 2 && nums[p] < nums[p + 1]) {
    p += 1;
  }
  if (p === 0) {
    return false;
  }

  // Phase 2: strictly decreasing
  let q = p;
  while (q < n - 1 && nums[q] > nums[q + 1]) {
    q += 1;
  }
  if (q === p || q === n - 1) {
    return false;
  }

  // Phase 3: strictly increasing
  while (q < n - 1 && nums[q] < nums[q + 1]) {
    q += 1;
  }

  return q === n - 1;
}
