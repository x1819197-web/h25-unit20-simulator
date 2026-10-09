/* Seedli tasodifiy generator (mulberry32) — Math.random TAQIQLANADI.
 * Bir xil seed = bir xil bias/fazalar = takrorlanuvchi simulyatsiya. */

(function (root) {
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  root.H25_RNG = mulberry32;
  if (typeof module !== "undefined" && module.exports) module.exports = mulberry32;
})(typeof window !== "undefined" ? window : globalThis);
