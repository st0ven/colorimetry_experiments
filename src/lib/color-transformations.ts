import { invertMatrix, matrixMultiply, rotateMatrix } from "./math-conversion";
import {
  ColorSpace,
  Illuminant,
  ColorModel,
  illuminantMap,
  colorSpaceMap,
  adaptations,
  normalRanges,
} from "./color-constants";
import { compandDict, CompandMethod, transferParams } from "./gamma-conversion";
import { flatten } from "./math-conversion";

const transformMap: any = {
  [ColorModel.LCHuv]: {
    [ColorModel.LUV]: transform_LCHuv_to_LUV,
    [ColorModel.RGB]: transform_LCHuv_to_RGB,
  },
  [ColorModel.LUV]: {
    [ColorModel.LCHuv]: transform_LUV_to_LCHuv,
    [ColorModel.XYZ]: transform_LUV_to_XYZ,
  },
  [ColorModel.RGB]: {
    [ColorModel.LUV]: transform_RGB_to_LUV,
    [ColorModel.LCHuv]: transform_RGB_to_LCHuv,
    [ColorModel.XYZ]: transform_RGB_to_XYZ,
    [ColorModel.xyY]: transform_RGB_to_xyY,
  },
  [ColorModel.XYZ]: {
    [ColorModel.LUV]: transform_XYZ_to_LUV,
    [ColorModel.RGB]: transform_XYZ_to_RGB,
    [ColorModel.xyY]: transform_XYZ_to_xyY,
  },
  [ColorModel.xyY]: {
    [ColorModel.XYZ]: transform_xyY_to_XYZ,
  },
};

// Provides an accessor to translate one color space into another.
// Uses transformMap to derive the necessary transformation function.
export function Transform(sourceModel: ColorModel): any {
  function to(destModel: ColorModel): any {
    return transformMap[sourceModel][destModel];
  }
  return {
    to,
  };
}

// use to transform from one reference illuminant to another
// reference page:
// http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html
function applyChromaticAdaptation(
  colorXyz: number[],
  sourceIlluminant: Illuminant,
  referenceIlluminant: Illuminant,
  useAdaptationMatrix?: number[][]
): number[] {
  // white point is the same, no adaptation is necessary
  if (sourceIlluminant === referenceIlluminant) {
    return colorXyz;
  }
  // otherwise calculate adaptation between whitespace values and apply to XYZ color
  const adaptiveMatrix: number[][] | undefined =
    useAdaptationMatrix ||
    deriveChromaticAdaptationMatrixFor(sourceIlluminant, referenceIlluminant);

  if (adaptiveMatrix) {
    // convert the adapted XYZ values
    return flatten(
      matrixMultiply(adaptiveMatrix, rotateMatrix([colorXyz]))
    ).map((component: number) => (isNaN(component) ? 0 : component));
  } else {
    throw new Error(
      `Error encountered deriving chromatic adaptation matrix. Result was returned as 'undefined'`
    );
  }
  // otherwise whitepoints came up null, throw an error
}

export function deriveChromaticAdaptationMatrixFor(
  sourceIlluminant: Illuminant,
  referenceIlluminant: Illuminant
): number[][] | undefined {
  const s_whitepoint: number[] | undefined = illuminantMap.get(
    sourceIlluminant
  );
  const d_whitepoint: number[] | undefined = illuminantMap.get(
    referenceIlluminant
  );

  // check to ensure both whitepoints are valid
  if (s_whitepoint && d_whitepoint) {
    // define cone response primaries from a source illuminant
    const sourceCrsp: number[] = flatten(
      matrixMultiply(adaptations.bradford, rotateMatrix([s_whitepoint]))
    );

    // define cone response primaries from a destination illuminant (d50)
    const destCrsp: number[] = flatten(
      matrixMultiply(adaptations.bradford, rotateMatrix([d_whitepoint]))
    );

    // define the cone response matrix
    const crspMatrix: number[][] = [
      [destCrsp[0] / sourceCrsp[0], 0, 0],
      [0, destCrsp[1] / sourceCrsp[1], 0],
      [0, 0, destCrsp[2] / sourceCrsp[2]],
    ];

    // calculate the transformation matrix
    const adaptiveMatrix: number[][] = matrixMultiply(
      matrixMultiply(invertMatrix(adaptations.bradford), crspMatrix),
      adaptations.bradford
    );

    return adaptiveMatrix;
  } else {
    // otherwise whitepoints came up null, throw an error
    throw new Error(
      `Error attempting to apply chromatic adaptation: Source or destination whitepoint was undefined. \nsource whitepoint: ${s_whitepoint}, destination whitepoint: ${d_whitepoint}`
    );
  }
}

// get the matrix required to transform an RGB space to linear space
// Mote: the reverse transform can use the inverse of the resulting matrix
export function deriveRgbTransformationMatrixFor(
  colorSpace: ColorSpace,
  referenceIlluminant?: Illuminant
): number[][] {
  // deconstruct profile to gather primaries in xy form and reference illuminant
  const { primaries } = colorSpaceMap.get(colorSpace) || {};

  // grab the whitepoint vertex for the supplied illuminant
  const whitepoint: number[] | undefined =
    referenceIlluminant && illuminantMap.has(referenceIlluminant)
      ? illuminantMap.get(referenceIlluminant)
      : undefined;

  if (primaries && whitepoint) {
    /*
    onstruct xyz matrix from xyY primary values. Required for the calculation 
    to determine the transformation matrix when moving from an RGB color space to 
    reference XYZ space. Source of this calculation can be found at: 
    http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html
    */
    const xyzMatrix: number[][] = rotateMatrix(
      primaries.map((primary: number[]) => [
        primary[0] / primary[1],
        1,
        (1 - primary[0] - primary[1]) / primary[1],
      ])
    );

    // calculate source RGB from matrix M and the illuminant
    const sourceRGB: number[] = flatten(
      matrixMultiply(invertMatrix(xyzMatrix), rotateMatrix([whitepoint]))
    );

    // multiply sourceRGB with xyzMatrix values to get the transform matrix M
    const tMatrix: number[][] = xyzMatrix.map((component_xyz: number[]) =>
      component_xyz.map(
        (component: number, index: number) => component * sourceRGB[index]
      )
    );

    // return the derived matrix
    return tMatrix;
  } else {
    // otherwise an issue was encountered, throw an error.
    throw new Error(
      `Could not derive RGB Transformation Matrix. Either of the required parameters 'primaries' or 'whitepoint' was undefined`
    );
  }
}

// given a normalized color touple, expand to represent an array of RGB primarmies.
// Optionally provide the desired bit depth (default to 8 bit color)
export function expandRgbColor(
  [Xn, Yn, Zn]: number[],
  bitDepth: number = 8
): number[] {
  const coeff: number = Math.pow(2, bitDepth) - 1;
  return [Xn * coeff, Yn * coeff, Zn * coeff];
}

// given a pair of colors, calculate the contrast ratio between them
export function findContrastRatio(c1_XYZ: number[], c2_XYZ: number[]): number {
  const [x1, y1, z1] = c1_XYZ;
  const [x2, y2, z2] = c2_XYZ;
  const l1: number = y1 > y2 ? y1 : y2;
  const l2: number = y1 > y2 ? y2 : y1;
  return (y1 + 0.05) / (y2 + 0.05);
}

// takes a coordinate in RGB refernce space and projects onto a
// 3d plane for easier visualization of the chromaticity plot
export function normalizeColor([X, Y, Z]: number[]): number[] {
  const sum: number = X + Y + Z;
  return [X / sum, Y / sum, Z / sum];
}

// takes a color touple of some bit depth and returns a normalized range for each component
export function normalizeRgbColor(
  [x, y, z]: number[],
  bitDepth: number = 8
): number[] {
  const denominator: number = Math.pow(2, bitDepth) - 1;
  return [x / denominator, y / denominator, z / denominator];
}

// normalize Luv components within a range of 0-1
export function normalizeLuvColor([L, u, v]: number[]): number[] {
  return [
    Math.abs(
      L /
        (normalRanges[ColorModel.LUV].L[1] - normalRanges[ColorModel.LUV].L[0])
    ),
    Math.abs(
      u /
        (normalRanges[ColorModel.LUV].U[1] - normalRanges[ColorModel.LUV].U[0])
    ),
    Math.abs(
      v /
        (normalRanges[ColorModel.LUV].V[1] - normalRanges[ColorModel.LUV].V[0])
    ),
  ];
}

// normalize LCh components within a range of 0-1
export function normalizeLchColor([L, C, h]: number[]): number[] {
  return [
    L /
      (normalRanges[ColorModel.LCHuv].L[1] -
        normalRanges[ColorModel.LCHuv].L[0]),
    C /
      (normalRanges[ColorModel.LCHuv].C[1] -
        normalRanges[ColorModel.LCHuv].C[0]),
    h /
      (normalRanges[ColorModel.LCHuv].H[1] -
        normalRanges[ColorModel.LCHuv].H[0]),
  ];
}

// Conversion helper functions that allow for determining tarnsform matrix
// from some defined color space back into XYZ color space
export function project_XYZ_to_xyY([cX, cY]: number[]): number[] {
  return [cX, cY, 1 - cX - cY];
}

export function transform_LCHuv_to_LUV([L, C, h]: number[]): number[] {
  const hRad: number = (h * Math.PI) / 180;
  const u: number = C * Math.cos(hRad);
  const v: number = C * Math.sin(hRad);

  return [L, u, v];
}

export function transform_LCHuv_to_RGB(
  colorLch: number[],
  referenceIlluminant: Illuminant = Illuminant.D50,
  colorSpace: ColorSpace
): number[] {
  return transform_XYZ_to_RGB(
    transform_LUV_to_XYZ(transform_LCHuv_to_LUV(colorLch), Illuminant.D65),
    colorSpace,
    referenceIlluminant,
    true
  ).map((c) => {
    c = isNaN(c) ? 0 : c;
    let cRound: number = Math.round(c * 255);
    return cRound < 0 ? 0 : cRound > 255 ? 255 : cRound;
  });
}

export function transform_LUV_to_LCHuv([L, U, V]: number[]): number[] {
  const arcTan2: number = Math.atan2(V, U);
  const rad2deg: number = 180 / Math.PI;

  const C: number = Math.sqrt(Math.pow(U, 2) + Math.pow(V, 2));
  const h: number = arcTan2 >= 0 ? arcTan2 * rad2deg : arcTan2 * rad2deg + 360;

  return [L, C, h];
}

export function transform_LUV_to_XYZ(
  [L, u, v]: number[],
  referenceIlluminant: Illuminant
): number[] {
  if (illuminantMap.has(referenceIlluminant)) {
    const [Xr, Yr, Zr] = illuminantMap.get(referenceIlluminant) as number[];

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
  } else {
    throw new Error(
      `Error transforming LUV to XYZ model: Reference Illuminant was undefined`
    );
  }
}

export function transform_RGB_to_LCHuv(
  colorRgb: number[],
  fromColorSpace: ColorSpace,
  referenceIlluminant: Illuminant = Illuminant.D50,
  compand: boolean = false
): number[] {
  return transform_LUV_to_LCHuv(
    transform_RGB_to_LUV(colorRgb, fromColorSpace, referenceIlluminant, compand)
  );
}

export function transform_RGB_to_LUV(
  colorRgb: number[],
  fromColorSpace: ColorSpace,
  referenceIlluminant: Illuminant = Illuminant.D50,
  compand: boolean = false
) {
  return transform_XYZ_to_LUV(
    transform_RGB_to_XYZ(colorRgb, fromColorSpace, referenceIlluminant, {
      compand,
    }),
    referenceIlluminant
  );
}

export interface RgbTransformationOptions {
  compand?: boolean;
  useAdaptationMatrix?: number[][];
  useTransformationMatrix?: number[][];
}

// Forward transformation from RGB to XYZ space.
// Can optionally take in parameters to determine illuminants for chromatic adaptation
// and a boolean for whether to apply gamma correction to the final number
export function transform_RGB_to_XYZ(
  colorRgb: number[],
  colorSpace: ColorSpace,
  referenceIlluminant: Illuminant = Illuminant.D50,
  options: RgbTransformationOptions = {}
): number[] {
  // destructure options
  const {
    compand = false,
    useTransformationMatrix,
    useAdaptationMatrix,
  } = options;

  // grab source illuminant of the colorSpace
  const sourceIlluminant: Illuminant | undefined = colorSpaceMap.get(colorSpace)
    ?.illuminant;

  // a valid source illuminant is a function dependency
  if (sourceIlluminant) {
    // normalize rgb values
    const normalized_color: number[] = normalizeRgbColor(colorRgb);

    // get reference for which method the destination color space uses for companding
    const compandMethod: CompandMethod = transferParams[colorSpace].method;

    // get reference to the color space dependent nonLinear method
    const compandFunc: any = compandDict[compandMethod].linear;

    // get the computed linear RGB color based on the compand function
    const linearColor: number[] = compandFunc(normalized_color, colorSpace);

    // get the proper transform matrix based on the destination color space
    // optionally use the transform matrix provided as an argument.
    const transformMatrix: number[][] =
      useTransformationMatrix ||
      deriveRgbTransformationMatrixFor(colorSpace, referenceIlluminant);

    // compute the color in XYZ space
    const transformed_color: number[] = flatten(
      matrixMultiply(
        transformMatrix,
        rotateMatrix([compand ? linearColor : normalized_color])
      )
    );

    // perform chromatic adaptation transformation in case the illuminants of the
    // reference space and rgb space are different.
    return sourceIlluminant === Illuminant.D50
      ? transformed_color
      : applyChromaticAdaptation(
          transformed_color,
          sourceIlluminant,
          Illuminant.D50,
          useAdaptationMatrix
        );

    // without a source Illuminant, throw an error
  } else {
    throw new Error(
      `Error in transforming RGB to XYZ model: source illuminant is undefined`
    );
  }
}

export function transform_RGB_to_xyY(
  colorRgb: number[],
  colorSpace: ColorSpace,
  referenceIlluminant: Illuminant = Illuminant.D50,
  compand: boolean = false
): number[] {
  return transform_XYZ_to_xyY(
    transform_RGB_to_XYZ(colorRgb, colorSpace, referenceIlluminant, { compand })
  );
}

// convert xyY representation to XYZ space
export function transform_xyY_to_XYZ([x, y, Y]: number[]): number[] {
  return [(x * Y) / y, Y, ((1 - x - y) * Y) / y];
}

export function transform_XYZ_to_LUV(
  XYZ_color: number[],
  referenceIlluminant: Illuminant = Illuminant.D50
): number[] {
  const whitepoint: number[] | undefined = illuminantMap.get(
    referenceIlluminant
  );

  if (!whitepoint) {
    throw new Error(
      `Error in transforming XYZ to LUV model: Undefined reference whitepoint`
    );
  } else {
    // constants used in conversion standard
    const threshold = 216 / 24389;
    const coeff = 24389 / 27;

    // destructure reference white and source color primaries
    const [Xr, Yr, Zr]: number[] = whitepoint;
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
}

// Inverse transformation of transform_RGB_to_XYZ with the same options available
export function transform_XYZ_to_RGB(
  XYZ_color: number[],
  colorSpace: ColorSpace,
  referenceIlluminant: Illuminant = Illuminant.D50,
  compand?: boolean
): number[] {
  const sourceIlluminant: Illuminant | undefined = colorSpaceMap.get(colorSpace)
    ?.illuminant;

  if (!sourceIlluminant) {
    throw new Error(
      `Error transforming XYZ to RGB model: Source Illuminant was undefined`
    );
  } else {
    // get reference for which method the destination color space uses for companding
    const compandMethod: CompandMethod = transferParams[colorSpace].method;

    // get reference to the color space dependent nonLinear method
    const compandFunc: any = compandDict[compandMethod].nonLinear;

    // get the proper transform matrix based on the destination color space
    const transformMatrix: number[][] = deriveRgbTransformationMatrixFor(
      colorSpace,
      referenceIlluminant
    );

    const adapted_color: number[] = applyChromaticAdaptation(
      XYZ_color,
      sourceIlluminant,
      referenceIlluminant
    );

    const linearColor: number[] = flatten(
      matrixMultiply(
        invertMatrix(transformMatrix),
        rotateMatrix([adapted_color])
      )
    );

    return compandFunc(compand ? linearColor : adapted_color, colorSpace);
  }
}

// convert XYZ color to xyY representation
export function transform_XYZ_to_xyY([X, Y, Z]: number[]): number[] {
  const sum: number = X + Y + Z;
  return [X / sum, Y / sum, Y];
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
