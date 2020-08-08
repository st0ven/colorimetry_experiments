const divisions: number = 4;
const delta: number = 256 / divisions;
export const rgbEdgePoints: number[][][] = Array(divisions + 1)
  .fill(null)
  .map((path: number[][] | null, i: number) => {
    path = [];
    const g: number = i * delta - (i ? 1 : 0);
    //for (let g: number = 0; g < 256; g+=63) {
    for (
      let b: number = 0;
      b <= 256 - delta + 1;
      b + delta < 256 ? (b += delta) : (b += delta - 1)
    ) {
      path.push([0, g, b]);
    }
    for (
      let r: number = 0;
      r <= 256 - delta + 1;
      r + delta < 256 ? (r += delta) : (r += delta - 1)
    ) {
      path.push([r, g, 255]);
    }
    for (
      let b: number = 255;
      b >= 0 + delta -1;
      b - delta > 0 ? (b -= delta) : (b -= delta - 1)
    ) {
      path.push([255, g, b]);
    }
    for (
      let r: number = 255;
      r >= 0 + delta -1;
      r - delta > 0 ? (r -= delta) : (r -= delta - 1)
    ) {
      path.push([r, g, 0]);
    }
    //}
    return path
  });
