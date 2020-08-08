import { invertMatrix, matrixMultiply, rotateMatrix } from "./coordinate-math";
import { ColorSpace, Illuminant, illuminant, colorSpace } from "./color-space";
import { compand, CompandMethod, transferParams } from "./gamma-conversion";

interface ColorTransformOptions {
  compand?: boolean;
  referenceIlluminant?: Illuminant;
  sourceIlluminant?: Illuminant;
}

// chromatic adatpation matricies
export const adaptiveMatrix = {
  vonKries: [
    [0.4002, 0.7076, -0.0808],
    [-0.2263, 1.1653, 0.0457],
    [0, 0, 0.9182],
  ],
  bradford: [
    [0.8951, 0.2664, -0.1614],
    [-0.7502, 1.7135, 0.0367],
    [0.0389, -0.0685, 1.0296],
  ],
  scale: [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
};

export const LuvRanges = {
  L: [0, 100],
  U: [-134, 220],
  V: [-140, 122],
};

export const LChRanges = {
  L: [0, 100],
  C: [0, 200],
  H: [0, 360],
};

// use to transform from one reference illuminant to another
// reference page:
// http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html
function chromatic_adaptation(
  s_XYZ: number[],
  s_illuminant: Illuminant,
  d_illuminant: Illuminant
): number[] {
  if (s_illuminant === d_illuminant) {
    // white point is the same, no adaptation is necessary
    return s_XYZ;
  } else {
    const s_whitepoint: number[] = illuminant[s_illuminant];
    const d_whitepoint: number[] = illuminant[d_illuminant];

    // define cone response primaries from a source illuminant
    const sourceCrsp: number[] = matrixMultiply(
      adaptiveMatrix.bradford,
      rotateMatrix([s_whitepoint])
    ).flat();

    // define cone response primaries from a destination illuminant (d50)
    const destCrsp: number[] = matrixMultiply(
      adaptiveMatrix.bradford,
      rotateMatrix([d_whitepoint])
    ).flat();

    // define the cone response matrix
    const crspMatrix: number[][] = [
      [destCrsp[0] / sourceCrsp[0], 0, 0],
      [0, destCrsp[1] / sourceCrsp[1], 0],
      [0, 0, destCrsp[2] / sourceCrsp[2]],
    ];

    // calculate the transformation matrix
    const tMatrix: number[][] = matrixMultiply(
      matrixMultiply(invertMatrix(adaptiveMatrix.bradford), crspMatrix),
      adaptiveMatrix.bradford
    );

    // convert the adapted XYZ values
    return matrixMultiply(tMatrix, rotateMatrix([s_XYZ]))
      .flat()
      .map((component: number) => (isNaN(component) ? 0 : component));
  }
}

// get the matrix required to transform an RGB space to linear space
// Mote: the reverse transform can use the inverse of the resulting matrix
function get_transformation_matrix_RGB_to_XYZ(
  toColorSpace: ColorSpace,
  r_illuminant?: Illuminant
): number[][] {
  // deconstruct profile to gather primaries in xy form and reference illuminant
  const { primaries } = colorSpace[toColorSpace];

  // look up the illuminant based on colorspace or optional param
  const referenceIlluminant: number[] =
    illuminant[r_illuminant || colorSpace[toColorSpace].illuminant];

  // construct xyz matrix from xyY primary vlaues
  const xyzMatrix: number[][] = get_XYZ_matrix_from_primaries(primaries);

  // calculate source RGB from matrix M and the illuminant
  const sourceRGB: number[] = matrixMultiply(
    invertMatrix(xyzMatrix),
    rotateMatrix([referenceIlluminant])
  ).flat();

  // multiply sourceRGB with xyzMatrix values to get the transform matrix M
  const tMatrix: number[][] = xyzMatrix.map((component_xyz: number[]) =>
    component_xyz.map(
      (component: number, index: number) => component * sourceRGB[index]
    )
  );

  return tMatrix;
}

// Conversion helper functions that allow for determining tarnsform matrix
// from some defined color space back into XYZ color space
export function get_xyY_projection([cX, cY]: number[]): number[] {
  return [cX, cY, 1 - cX - cY];
}

/*
Takes an array as a primary xy pair and derives a transformed array
which represents an XYZ-based set. This is ultimately used during the
calculation to determine the transformation matrix when moving from an 
RGB color space to reference XYZ space. Source of this calculation can be 
found at: http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html
*/
function get_XYZ_matrix_from_primaries(
  rgbSpacePrimaries: number[][]
): number[][] {
  return rotateMatrix(
    rgbSpacePrimaries.map((primary: number[]) => [
      primary[0] / primary[1],
      1,
      (1 - primary[0] - primary[1]) / primary[1],
    ])
  );
}

export function findContrastRatio(c1_XYZ: number[], c2_XYZ: number[]): number {
  const [x1, y1, z1] = c1_XYZ;
  const [x2, y2, z2] = c2_XYZ;
  const l1: number = y1 > y2 ? y1 : y2;
  const l2: number = y1 > y2 ? y2 : y1;
  return (y1 + 0.05) / (y2 + 0.05);
}

// convert XYZ color to xyY representation
export function XYZ_to_xyY([X, Y, Z]: number[]): number[] {
  const sum: number = X + Y + Z;
  return [X / sum, Y / sum, Y];
}

// convert xyY representation to XYZ space
export function xyY_to_XYZ([x, y, Y]: number[]): number[] {
  return [(x * Y) / y, Y, ((1 - x - y) * Y) / y];
}

// takes a coordinate in RGB refernce space and projects onto a
// 3d plane for easier visualization of the chromaticity plot
export function normalizeColor([X, Y, Z]: number[]): number[] {
  const sum: number = X + Y + Z;
  return [X / sum, Y / sum, Z / sum];
}

export function normalizeRGBColor(
  [x, y, z]: number[],
  bitDepth: number = 8
): number[] {
  const denominator: number = Math.pow(2, bitDepth) - 1;
  return [x / denominator, y / denominator, z / denominator];
}

export function normalizeLuvColor([L, u, v]: number[]): number[] {
  return [
    Math.abs(L / (LuvRanges.L[1] - LuvRanges.L[0])),
    Math.abs(u / (LuvRanges.U[1] - LuvRanges.U[0])),
    Math.abs(v / (LuvRanges.V[1] - LuvRanges.V[0])),
  ];
}

export function normalizeLchColor([L, C, h]: number[]): number[] {
  return [
    L / (LChRanges.L[1] - LChRanges.L[0]),
    C / (LChRanges.C[1] - LChRanges.C[0]),
    h / (LChRanges.H[1] - LChRanges.H[0]), //LChRanges.H[1] - LChRanges.H[0],
  ];
}

export function expandRgbColor(
  [Xn, Yn, Zn]: number[],
  bitDepth: number = 8
): number[] {
  const coeff: number = Math.pow(2, 8) - 1;
  return [Xn * coeff, Yn * coeff, Zn * coeff];
}

// Forward transformation from RGB to XYZ space.
// Can optionally take in parameters to determine illuminants for chromatic adaptation
// and a boolean for whether to apply gamma correction to the final number
export function transformRGBtoXYZ(
  rgb_color: number[],
  toColorSpace: ColorSpace,
  options: ColorTransformOptions = {}
): number[] {
  // normalize rgb values
  const {
    sourceIlluminant = colorSpace[toColorSpace].illuminant,
    referenceIlluminant = colorSpace[toColorSpace].illuminant,
  } = options;
  // get reference for which method the destination color space uses for companding
  const compandMethod: CompandMethod = transferParams[toColorSpace].method;

  // get reference to the color space dependent nonLinear method
  const compandFunc: any = compand[compandMethod].linear;

  // get the computed linear RGB color based on the compand function
  const linearColor: number[] = compandFunc(
    normalizeRGBColor(rgb_color),
    toColorSpace
  );

  // get the proper transform matrix based on the destination color space
  const transformMatrix: number[][] = get_transformation_matrix_RGB_to_XYZ(
    toColorSpace
  );

  // compute the color in XYZ space
  const XYZ_color: number[] = matrixMultiply(
    transformMatrix,
    rotateMatrix([
      options?.compand ? linearColor : normalizeRGBColor(rgb_color),
    ])
  ).flat();

  // perform chromatic adaptation transformation in case the illuminants of the
  // reference space and rgb space are different.
  return chromatic_adaptation(XYZ_color, sourceIlluminant, referenceIlluminant);
}

// Inverse transformation of transformRGBtoXYZ with the same options available
export function transformXYZtoRGB(
  XYZ_color: number[],
  toColorSpace: ColorSpace,
  options: ColorTransformOptions = {}
): number[] {
  const {
    sourceIlluminant = colorSpace[toColorSpace].illuminant,
    referenceIlluminant = colorSpace[toColorSpace].illuminant,
  } = options;

  // get reference for which method the destination color space uses for companding
  const compandMethod: CompandMethod = transferParams[toColorSpace].method;

  // get reference to the color space dependent nonLinear method
  const compandFunc: any = compand[compandMethod].nonLinear;

  // get the proper transform matrix based on the destination color space
  const transformMatrix: number[][] = get_transformation_matrix_RGB_to_XYZ(
    toColorSpace
  );

  const adapted_color: number[] = chromatic_adaptation(
    XYZ_color,
    sourceIlluminant,
    referenceIlluminant
  );

  const linearColor: number[] = matrixMultiply(
    invertMatrix(transformMatrix),
    rotateMatrix([adapted_color])
  ).flat();

  return compandFunc(
    options?.compand ? linearColor : adapted_color,
    toColorSpace
  );
}

export function transformXYZtoLUV(
  XYZ_color: number[],
  referenceIlluminant: Illuminant
): number[] {
  // constants used in conversion standard
  const threshold = 216 / 24389;
  const coeff = 24389 / 27;

  // destructure reference white and source color primaries
  const [Xr, Yr, Zr]: number[] = illuminant[
    Object(Illuminant)[referenceIlluminant]
  ];
  const [X, Y, Z]: number[] = XYZ_color;

  // derive prime values required for Luv calculation
  const yr = Y / Yr;
  const prime_denominator = X + 15 * Y + 3 * Z;
  const ref_prime_denominator = Xr + 15 * Yr + 3 * Zr;
  const u_prime = (4 * X) / prime_denominator || 0;
  const v_prime = (9 * Y) / prime_denominator || 0;
  const ur_prime = (4 * Xr) / ref_prime_denominator;
  const vr_prime = (9 * Yr) / ref_prime_denominator;

  // compute Luv components from derived values
  const L = yr > threshold ? 116 * Math.cbrt(yr) - 16 : coeff * yr;
  const u = 13 * L * (u_prime - ur_prime);
  const v = 13 * L * (v_prime - vr_prime);

  // return the transformed color in Luv format
  return [L, u, v];
}

export function transformLuvToXYZ(
  [L, u, v]: number[],
  referenceIlluminant: Illuminant
): number[] {
  const [Xr, Yr, Zr] = illuminant[referenceIlluminant];

  const subDenom: number = Xr + 15 * Yr + 3 * Zr;
  const uSub: number = (4 * Xr) / subDenom;
  const vSub: number = (9 * Yr) / subDenom;

  const threshold: number = 216 / 24389;
  const kappa: number = 24389 / 27;

  const Y: number =
    L > threshold * kappa ? Math.pow((L + 16) / 116, 3) : L / kappa;

  const a: number = (1 / 3) * ((52 * L) / (u + 13 * L * uSub) - 1);
  const b: number = -5 * Y;
  const c: number = -1 / 3;
  const d: number = Y * ((39 * L) / (v + 13 * L * vSub) - 5);

  let X: number = a - c === 0 ? 0 : (d - b) / (a - c);
  const Z: number = X * a + b;

  return [X, Y, Z];
}

export function transformLuvToLch([L, U, V]: number[]): number[] {
  const arcTan2: number = Math.atan2(V, U);
  const rad2deg: number = 180 / Math.PI;

  const C: number = Math.sqrt(Math.pow(U, 2) + Math.pow(V, 2));
  const h: number = arcTan2 >= 0 ? arcTan2 * rad2deg : arcTan2 * rad2deg + 360;

  return [L, C, h];
}

export function transformLchToLuv([L, C, h]: number[]): number[] {
  const hRad: number = (h * Math.PI) / 180;
  const u: number = C * Math.cos(hRad);
  const v: number = C * Math.sin(hRad);

  return [L, u, v];
}

export function transformLchToRgb(
  lch_color: number[],
  referenceIlluminant: Illuminant = Illuminant.D50,
  rgbSpace: ColorSpace
): number[] {
  return transformXYZtoRGB(
    transformLuvToXYZ(transformLchToLuv(lch_color), Illuminant.D65),
    rgbSpace,
    { referenceIlluminant, compand: true }
  ).map((c) => {
    c = isNaN(c) ? 0 : c;
    let cRound: number = Math.round(c * 255);
    return cRound < 0 ? 0 : cRound > 255 ? 255 : cRound;
  });
}

export function transformRgbToLch(
  rgb_color: number[],
  fromColorSpace: ColorSpace,
  referenceIlluminant: Illuminant = Illuminant.D50,
  compand: boolean = false,
): number[] {
  return transformLuvToLch(
    transformXYZtoLUV(
      transformRGBtoXYZ(rgb_color, fromColorSpace, {
        referenceIlluminant,
        compand: compand,
      }),
      referenceIlluminant
    )
  );
}

// Experiment to build approximations of CIE CMF data without having to store
// tabular representation of this data.
// reference: http://jcgt.org/published/0002/02/01/paper.pdf
export function approximateCMFValues(spectrum: number[]): number[][] {
  const coefficientTable: any = {
    x: {
      alpha: [0.362, 1.056, -0.065],
      beta: [442, 599.8, 501.1],
      gamma: [0.0624, 0.0264, 0.049],
      delta: [0.0374, 0.0323, 0.0382],
    },
    y: {
      alpha: [0.821, 0.286],
      beta: [568.8, 530.9],
      gamma: [0.0213, 0.0613],
      delta: [0.0247, 0.0322],
    },
    z: {
      alpha: [1.217, 0.681],
      beta: [437, 459],
      gamma: [0.0845, 0.0385],
      delta: [0.0278, 0.0725],
    },
  };

  function cBarSum(lambda: number, { alpha, beta, gamma, delta }: any): number {
    const gaussianPassCount: number = alpha.length;
    let sum: number = 0;
    for (let i = 0, t; i < gaussianPassCount; i++) {
      t = (lambda - beta[i]) * (lambda < beta[i] ? gamma[i] : delta[i]);
      sum += alpha[i] * Math.exp(-0.5 * t * t);
    }
    return sum;
  }

  return spectrum.map((lambda: number) =>
    ["x", "y", "z"].map((c: string) => cBarSum(lambda, coefficientTable[c]))
  );
}
