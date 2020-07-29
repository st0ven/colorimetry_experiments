import {
  invertMatrix,
  scaleMatrix,
  matrixMultiply,
  rotateMatrix,
} from "./coordinate-math";
import { ColorSpace, Illuminant, illuminant, colorSpace } from "./color-space";
import { compand, CompandMethod, transferParams } from "./gamma-conversion";

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

export interface CompandRGBtoXYZspaceParams {
  invert?: boolean;
  referenceIlluminant?: number[];
}

export function compand_RGB_RGB_Space(
  sourceColor: number[],
  sourceColorSpace: ColorSpace,
  destColorSpace: ColorSpace
): number[] {
  const destIlluminant: number[] = colorSpace[destColorSpace].illuminant;

  return compand_RGB_XYZ_Space(
    compand_RGB_XYZ_Space(sourceColor, sourceColorSpace, {
      referenceIlluminant: destIlluminant,
    }),
    sourceColorSpace,
    {
      invert: true,
      referenceIlluminant: destIlluminant,
    }
  );
}

export function compand_RGB_XYZ_Space(
  color_xyz: number[],
  colorSpaceName: ColorSpace,
  options?: CompandRGBtoXYZspaceParams
): number[] {
  // destructure options
  const { invert = false, referenceIlluminant = illuminant[Illuminant.D65] } =
    options || {};

  return matrixMultiply(
    // first a transformation matrix must be calculated based on
    // the target color space. Invert the matrix to translate from XYZ -> RGB
    invert
      ? invertMatrix(get_transformation_matrix_RGB_to_XYZ(colorSpaceName))
      : get_transformation_matrix_RGB_to_XYZ(colorSpaceName),
    rotateMatrix([
      // chromatic adaptation should be considered when the source
      // color space does not have a default illuminant of the
      // reference space using D65 illuminant
      chromatic_adaptation(
        color_xyz,
        colorSpace[colorSpaceName].illuminant,
        referenceIlluminant
      ),
    ])
  ).flat();
}

export function transformRGBtoXYZ(
  rgb_color: number[],
  destSpace: ColorSpace
): number[] {
  // get reference for which method the destination color space uses for companding
  const compandMethod: CompandMethod = transferParams[destSpace].method;

  // get reference to the color space dependent nonLinear method
  const compandFunc: any = compand[compandMethod].nonLinear;

  // get the computed linear RGB color based on the compand function
  const linearColor: number[] = compandFunc(rgb_color, destSpace);

  // get the proper transform matrix based on the destination color space
  const transformMatrix: number[][] = get_transformation_matrix_RGB_to_XYZ(
    destSpace
  );

  // calculate the matrix transformation to complete the process
  return matrixMultiply(transformMatrix, rotateMatrix([linearColor])).flat();
}

export function transformXYZtoRGB(
  xyz_color: number[],
  destSpace: ColorSpace
): number[] {
  // get reference for which method the destination color space uses for companding
  const compandMethod: CompandMethod = transferParams[destSpace].method;

  // get reference to the color space dependent nonLinear method
  const compandFunc: any = compand[compandMethod].linear;

  // get the proper transform matrix based on the destination color space
  const transformMatrix: number[][] = get_transformation_matrix_RGB_to_XYZ(
    destSpace
  );

  console.log(invertMatrix(transformMatrix));

  const linearColor: number[] = matrixMultiply(
    invertMatrix(transformMatrix),
    rotateMatrix([xyz_color])
  ).flat();

  return compandFunc(linearColor, destSpace);
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

// get the matrix required to transform an RGB space to linear space
// Mote: the reverse transform can use the inverse of the resulting matrix
function get_transformation_matrix_RGB_to_XYZ(
  colorSpaceName: ColorSpace,
  r_illuminant?: number[]
): number[][] {
  // deconstruct profile to gather primaries in xy form and reference illuminant
  const { primaries, illuminant } = colorSpace[colorSpaceName];

  // construct xyz matrix from xyY primary vlaues
  const xyzMatrix: number[][] = get_XYZ_matrix_from_primaries(primaries);

  // calculate source RGB from matrix M and the illuminant
  const sourceRGB: number[] = matrixMultiply(
    invertMatrix(xyzMatrix),
    rotateMatrix([r_illuminant || illuminant])
  ).flat();

  // multiply sourceRGB with xyzMatrix values to get the transform matrix M
  const tMatrix: number[][] = xyzMatrix.map((component_xyz: number[]) =>
    component_xyz.map(
      (component: number, index: number) => component * sourceRGB[index]
    )
  );

  return tMatrix;
}

// use to transform from one reference illuminant to another
// reference page:
// http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html
function chromatic_adaptation(
  s_XYZ: number[],
  s_illuminant: number[],
  d_illuminant: number[]
): number[] {
  if (s_illuminant === d_illuminant) {
    // white point is the same, no adaptation is necessary
    return s_XYZ;
  } else {
    // define cone response primaries from a source illuminant
    const sourceCrsp: number[] = matrixMultiply(
      adaptiveMatrix.bradford,
      rotateMatrix([s_illuminant])
    ).flat();

    // define cone response primaries from a destination illuminant (d50)
    const destCrsp: number[] = matrixMultiply(
      adaptiveMatrix.bradford,
      rotateMatrix([d_illuminant])
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
    return matrixMultiply(tMatrix, rotateMatrix([s_XYZ])).flat();
  }
}

export function convert_XYZ_to_xyY([X, Y, Z]: number[]) {
  const sum = X + Y + Z;
  return [X / sum, Y / sum, Y];
}

// Conversion helper functions that allow for determining tarnsform matrix
// from some defined color space back into XYZ color space
export function convert_component_xy_to_xyz([cX, cY]: number[]): number[] {
  return [cX, cY, 1 - cX - cY];
}

export function convert_component_xyY_to_XYZ([x, y, Y]: number[]): number[] {
  return [(x * Y) / y, Y, ((1 - x - y) * Y) / y];
}

export function convert_XYZ_to_Luv_space(
  c_XYZ: number[],
  w_xyY: number[]
): number[] {
  const threshold = 216 / 24389;
  const coeff = 24389 / 27;
  const [Xr, Yr, Zr]: number[] = find_wXYZ_from_wxyz(
    convert_component_xy_to_xyz(w_xyY)
  );
  const [X, Y, Z] = c_XYZ;
  const yr = Y / Yr;
  const prime_denominator = X + 15 * Y + 3 * Z;
  const ref_prime_denominator = Xr + 15 * Yr + 3 * Zr;
  const u_prime = (4 * X) / prime_denominator || 0;
  const v_prime = (9 * Y) / prime_denominator || 0;
  const ur_prime = (4 * Xr) / ref_prime_denominator;
  const vr_prime = (9 * Yr) / ref_prime_denominator;
  const L = yr > threshold ? 116 * Math.cbrt(yr) - 16 : coeff * yr;
  const u = 13 * L * (u_prime - ur_prime);
  const v = 13 * L * (v_prime - vr_prime);
  return [L, u, v];
}

export function convert_Luv_to_XYZ_space(
  c_Luv: number[],
  w_xyY: number[]
): number[] {
  const threshold = 216 / 24389;
  const [Xr, Yr, Zr]: number[] = find_wXYZ_from_wxyz(
    convert_component_xy_to_xyz(w_xyY)
  );
  const [L, u, v]: number[] = c_Luv;
  const ref_prime_denominator = Xr + 15 * Yr + 3 * Zr;
  const ur_prime = (4 * Xr) / ref_prime_denominator;
  const vr_prime = (9 * Yr) / ref_prime_denominator;
  const u_prime: number = (u / 13) * L + ur_prime;
  const v_prime: number = (v / 13) * L + vr_prime;
  const prime_denominator = 6 * u_prime - 16 * v_prime + 12;
  //const x: number = 9*u_prime / prime_denominator;
  //const y: number = 4*v_prime / prime_denominator;
  const Y: number =
    L > 8 ? Yr * L * threshold : Yr * Math.pow((L + 16) / 116, 3);
  const X: number = Y * ((9 * u_prime) / (4 * v_prime));
  const Z: number = Y * (((12 - 3 * u_prime - 20 * v_prime) / 4) * v_prime);
  return [X, Y, Z];
}

export function findContrastRatio(c1_XYZ: number[], c2_XYZ: number[]): number {
  const [x1, y1, z1] = c1_XYZ;
  const [x2, y2, z2] = c2_XYZ;
  const l1: number = y1 > y2 ? y1 : y2;
  const l2: number = y1 > y2 ? y2 : y1;
  return (y1 + 0.05) / (y2 + 0.05);
}

export function find_wXYZ_from_wxyz(wxyz: number[]): number[] {
  const [_, wy, __] = wxyz;
  return scaleMatrix(1 / wy, [wxyz])[0];
}

export function transfer_gammaRGB_to_linearRGB(
  gammaRGB: number[],
  colorSpaceName: ColorSpace
): number[] {
  const { alpha = 1, gammaLimit = 1, gammaLinear = 1 } = colorSpace[
    colorSpaceName
  ].transferParams;

  if (colorSpaceName === ColorSpace.sRGB) {
    const phi: number =
      (Math.pow(alpha, gammaLimit) * Math.pow(gammaLimit - 1, gammaLimit - 1)) /
      (Math.pow(alpha - 1, gammaLimit - 1) * Math.pow(gammaLimit, gammaLimit));

    const Ksub0: number = (alpha - 1) / (gammaLimit - 1);

    const linearThreshold: number = Ksub0 / phi;

    return gammaRGB.map((c: number) =>
      isFinite(phi)
        ? c < linearThreshold
          ? phi * c
          : alpha * Math.pow(c, 1 - gammaLimit) - (1 - alpha)
        : Math.pow(c, gammaLinear)
    );
  } else {
    return gammaRGB.map((component: number) =>
      Math.pow(component, 1 / gammaLimit)
    );
  }
}

export function gammaCorrect_linearRGB_to_sRGB(
  linearRGB: number[],
  colorSpaceName: ColorSpace
): number[] {
  const { alpha = 1, gammaLimit = 1, gammaLinear = 1 } = colorSpace[
    colorSpaceName
  ].transferParams;

  if (colorSpaceName === ColorSpace.sRGB) {
    const phi: number =
      (Math.pow(alpha, gammaLimit) * Math.pow(gammaLimit - 1, gammaLimit - 1)) /
      (Math.pow(alpha - 1, gammaLimit - 1) * Math.pow(gammaLimit, gammaLimit));

    const Ksub0: number = (alpha - 1) / (gammaLimit - 1);

    const linearThreshold: number = Ksub0 / phi;

    return linearRGB.map((c: number) =>
      isFinite(phi)
        ? c < linearThreshold
          ? phi * c
          : alpha * Math.pow(c, 1 - gammaLimit) - (1 - alpha)
        : Math.pow(c, gammaLinear)
    );
  } else {
    return linearRGB.map((component: number) =>
      Math.pow(component, 1 / gammaLimit)
    );
  }
}

// Experiment to build approximations of CIE CMF data without having to store
// tabular representation of this data.
// reference: http://jcgt.org/published/0002/02/01/paper.pdf
export function expandCMFValues(spectrum: number[]): number[][] {
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
