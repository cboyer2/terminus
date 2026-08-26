import { describe, expect, it } from "vitest";

import { workingWeight } from "../calc";

/**
 * Frozen fixture, hand-verified against the percentage chart in
 * "5/3/1 2nd Edition" pages 119-121 (WEIGHT column x 60-95% columns).
 * A representative spread across the chart's range, not the full table —
 * per docs/ARCHITECTURE.md's "hand-check a few real cycles ... freeze the
 * expected output," and per CLAUDE.md's rule against reproducing the
 * source material wholesale.
 *
 * Values were read from a zoomed crop of each page, not the full-page
 * thumbnail — a first low-resolution pass misread 185 lb @ 85% as 160
 * (it's 155, matching the formula) and would have produced a wrong
 * fixture if left uncorrected.
 */
const percents = [0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95];

const bookRows: Record<number, number[]> = {
  // p.119
  105: [65, 70, 75, 80, 85, 90, 95, 100],
  110: [65, 70, 75, 85, 90, 95, 100, 105], // 110 x 75% = 82.5, a tie -> 85
  115: [70, 75, 80, 85, 90, 100, 105, 110],
  120: [70, 80, 85, 90, 95, 100, 110, 115],
  125: [75, 80, 90, 95, 100, 105, 115, 120],
  130: [80, 85, 90, 100, 105, 110, 115, 125],
  180: [110, 115, 125, 135, 145, 155, 160, 170],
  185: [110, 120, 130, 140, 150, 155, 165, 175],
  190: [115, 125, 135, 145, 150, 160, 170, 180],
  195: [115, 125, 135, 145, 155, 165, 175, 185],
  200: [120, 130, 140, 150, 160, 170, 180, 190],
  // p.120
  305: [185, 200, 215, 230, 245, 260, 275, 290],
  310: [185, 200, 215, 235, 250, 265, 280, 295],
  315: [190, 205, 220, 235, 250, 270, 285, 300],
  320: [190, 210, 225, 240, 255, 270, 290, 305],
  325: [195, 210, 225, 245, 260, 275, 295, 310],
  330: [200, 215, 230, 250, 265, 280, 295, 315],
  // p.121
  505: [305, 330, 355, 380, 405, 430, 455, 480],
  510: [305, 330, 355, 385, 410, 435, 460, 485],
  515: [310, 335, 360, 385, 410, 440, 465, 490],
  520: [310, 340, 365, 390, 415, 440, 470, 495],
  525: [315, 340, 370, 395, 420, 445, 475, 500],
  530: [320, 345, 370, 400, 425, 450, 475, 505],
  680: [410, 440, 475, 510, 545, 580, 610, 645],
  685: [410, 445, 480, 515, 550, 580, 615, 650],
  690: [415, 450, 485, 520, 550, 585, 620, 655],
  695: [415, 450, 485, 520, 555, 590, 625, 660],
  700: [420, 455, 490, 525, 560, 595, 630, 665],
};

describe("workingWeight against the book's percentage chart (pp. 119-121)", () => {
  for (const [trainingMaxLb, expected] of Object.entries(bookRows)) {
    it(`training max ${trainingMaxLb}`, () => {
      const actual = percents.map((p) => workingWeight(Number(trainingMaxLb), p));
      expect(actual).toEqual(expected);
    });
  }
});
