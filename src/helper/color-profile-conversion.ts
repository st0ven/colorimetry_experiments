import {
  invertMatrix,
  scaleMatrix,
  matrixMultiply,
  rotateMatrix,
} from "./coordinate-math";

export enum ColorSpace {
  adobeRGB = "adobeRGB",
  adobeWideGamut = "adobeWideGamut",
  appleRGB = "appleRGB",
  displayP3 = "displayP3",
  sRGB = "sRGB",
}

export enum Illuminant {
  A,
  B,
  C,
  D50,
  D55,
  D65,
  D75,
  E,
  F2,
  F7,
  F11,
}

export const illuminant: any = {
  [Illuminant.A]: [1.0985, 1, 0.35585],
  [Illuminant.B]: [0.99072, 1, 0.85223],
  [Illuminant.C]: [0.98074, 1, 1.18232],
  [Illuminant.D50]: [0.96422, 1, 0.82521],
  [Illuminant.D55]: [0.95682, 1, 0.92149],
  [Illuminant.D65]: [0.95047, 1, 1.08883],
  [Illuminant.D75]: [0.94972, 1, 1.22638],
  [Illuminant.E]: [1, 1, 1],
  [Illuminant.F2]: [0.99186, 1, 0.67393],
  [Illuminant.F7]: [0.95041, 1, 1.08747],
  [Illuminant.F11]: [1.00962, 1, 0.6435],
};

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
    [0.0389, 0.0685, 1.0296],
  ],
  scale: [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
};

export const profiles: any = {
  [ColorSpace.adobeRGB]: {
    convertToReferenceSpace: convert_space_RGB_to_XYZ,
    convertFromReferenceSpace: convert_space_XYZ_to_RGB,
    illuminant: illuminant[Illuminant.D65],
    label: "Adobe RGB 1998",
    primaries: [
      [0.64, 0.33],
      [0.21, 0.71],
      [0.15, 0.06],
    ],
    transferParams: {
      alpha: 1,
      gammaLimit: 563 / 256,
      gammaLinear: 1.8,
    },
  },
  [ColorSpace.adobeWideGamut]: {
    convertToReferenceSpace: convert_space_RGB_to_XYZ,
    convertFromReferenceSpace: convert_space_XYZ_to_RGB,
    illuminant: illuminant[Illuminant.D50],
    label: "Adobe Wide Gamut",
    primaries: [
      [0.7347, 0.2653],
      [0.1152, 0.8264],
      [0.1566, 0.0177],
    ],
    transferParams: {
      alpha: 1,
      gammaLimit: 536 / 256,
      gammaLinear: 2.2,
    },
  },
  [ColorSpace.appleRGB]: {
    convertToReferenceSpace: convert_space_RGB_to_XYZ,
    convertFromReferenceSpace: convert_space_XYZ_to_RGB,
    illuminant: illuminant[Illuminant.D65],
    label: "Apple RGB",
    primaries: [
      [0.625, 0.34],
      [0.28, 0.595],
      [0.155, 0.07],
    ],
    transferParams: {
      alpha: 1,
      gammaLimit: 536 / 256,
      gammaLinear: 1.8,
    },
  },
  [ColorSpace.displayP3]: {
    convertToReferenceSpace: convert_space_RGB_to_XYZ,
    convertFromReferenceSpace: convert_space_XYZ_to_RGB,
    illuminant: illuminant[Illuminant.D65],
    label: "Display P3",
    primaries: [
      [0.68, 0.32],
      [0.265, 0.69],
      [0.15, 0.06],
    ],
    transferParams: {
      alpha: 1.055,
      gammaLimit: 12 / 5,
      gammaLinear: 2.2,
    },
  },
  [ColorSpace.sRGB]: {
    convertToReferenceSpace: convert_space_RGB_to_XYZ,
    convertFromReferenceSpace: convert_space_XYZ_to_RGB,
    illuminant: illuminant[Illuminant.D65],
    label: "sRGB",
    primaries: [
      [0.64, 0.33],
      [0.3, 0.6],
      [0.15, 0.06],
    ],
    transferParams: {
      alpha: 1.055,
      gammaLimit: 12 / 5,
      gammaLinear: 2.2,
    },
  },
};

/*
Takes an array as a primary xy pair and derives a transformed array
which represents an XYZ-based set. This is ultimately used furing the
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
  rgbSpace: ColorSpace,
  r_illuminant?: number[]
): number[][] {
  // deconstruct profile to gather primaries in xy form and reference illuminant
  const { primaries, illuminant } = profiles[rgbSpace];

  // construct xyz matrix from xyY primary vlaues
  const xyzMatrix: number[][] = get_XYZ_matrix_from_primaries(primaries);

  // calculate source RGB from matrix M and the illuminant
  const sourceRGB: number[] = matrixMultiply(
    invertMatrix(xyzMatrix),
    rotateMatrix([r_illuminant || illuminant])
  ).flat();

  // multiply sourceRGB with xyzMatrix values to get the transform matrix M
  return xyzMatrix.map((component_xyz: number[]) =>
    component_xyz.map(
      (component: number, index: number) => component * sourceRGB[index]
    )
  );
}

export function convert_space_RGB_to_XYZ(
  rgbNormal: number[], // expects [r,g,b] format from 0-1
  toRGBspace: ColorSpace
): number[] {
  //console.log(get_transformation_matrix_RGB_to_XYZ(toRGBspace));
  // return the XYZ value from the RGB color argument to transform
  return matrixMultiply(
    get_transformation_matrix_RGB_to_XYZ(toRGBspace),
    rotateMatrix([
      chromatic_adaptation(
        rgbNormal,
        profiles[toRGBspace].illuminant,
        illuminant[Illuminant.D50]
      ),
    ])
  ).flat();
}

export function convert_space_XYZ_to_RGB(
  xyzColor: number[],
  toRGBspace: ColorSpace
) {
  return matrixMultiply(
    invertMatrix(get_transformation_matrix_RGB_to_XYZ(toRGBspace)),
    rotateMatrix([
      chromatic_adaptation(
        xyzColor,
        profiles[toRGBspace].illuminant,
        illuminant[Illuminant.D50]
      ),
    ])
  ).flat();
}

// use to transform from one reference illuminant to another
// reference page:
// http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html
function chromatic_adaptation(
  s_XYZ: number[],
  s_illuminant: number[],
  d_illuminant: number[]
): number[] {
  console.log(s_illuminant,d_illuminant)
  if (s_illuminant === d_illuminant) {
    // white point is the same, no adaptation is necessary
    return s_XYZ;
  } else {
    console.log('adapt');
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

/*
export function calculate_XYZspace_transformation_matrix(
  source_component_primaries_xyY: number[][],
  source_whitepoint_xyY: number[]
): number[][] {
  const XYZ_primaries: number[][] = source_component_primaries_xyY.map(
    (primary: number[]) => convert_component_xy_to_xyz(primary)
  );
  const XYZ_whitepoint: number[] = find_wXYZ_from_wxyz(
    convert_component_xy_to_xyz(source_whitepoint_xyY)
  );
  const XYZ_primaries_rotated: number[][] = rotateMatrix(XYZ_primaries);
  const [rXYZ, gXYZ, bXYZ]: number[][] = matrixMultiply(
    invertMatrix(XYZ_primaries_rotated),
    rotateMatrix([XYZ_whitepoint])
  );
  const V_expanded = [
    [...rXYZ, 0, 0],
    [0, ...gXYZ, 0],
    [0, 0, ...bXYZ],
  ];
  const transformMatrix = matrixMultiply(XYZ_primaries_rotated, V_expanded);
  return transformMatrix;
}
*/

/*
 Conversion helper functions that allow for determining tarnsform matrix from some defined color space back into XYZ color space
*/
export function convert_component_xy_to_xyz([cX, cY]: number[]): number[] {
  return [cX, cY, 1 - cX - cY];
}

export function convert_component_xyY_to_XYZ(xyYCoord: number[]): number[] {
  return [
    (xyYCoord[0] * xyYCoord[2]) / xyYCoord[1],
    xyYCoord[2],
    ((1 - xyYCoord[0] - xyYCoord[1]) * xyYCoord[2]) / xyYCoord[1],
  ];
}
/*
export function convert_RGB_to_XYZ_space(
  rgb: number[],
  colorSpace: ColorSpace
): number[] {
  const { primaries, whitePoint } = profiles[colorSpace];
  const linear_rgb: number[] = gammaCorrect_sRGB_to_linearRGB(rgb);
  const tMatrix: number[][] = calculate_XYZspace_transformation_matrix(
    primaries,
    whitePoint
  );
  return rotateMatrix(
    matrixMultiply(tMatrix, rotateMatrix([linear_rgb]))
  ).flat();
}

export function convert_XYZ_to_sRGB_space(XYZ_color: number[]) {
  const tMatrix: number[][] = [
    [3.24096994, -1.5378318, -0.49861076],
    [-0.96924364, 1.8759675, 0.04155506],
    [0.05563008, -0.20397696, 1.05697151],
  ];
  const whitePoint: number[] = [0.9505, 1, 1.089];
  const linearRGB: number[] = matrixMultiply(
    tMatrix,
    rotateMatrix([XYZ_color])
  ).flat();
  return gammaCorrect_linearRGB_to_sRGB(linearRGB)
    .map((component_linearRGB: number) => component_linearRGB * 255)
    .map((component_linearRGB: number) =>
      component_linearRGB < 0
        ? 0
        : component_linearRGB > 255
        ? 255
        : Math.round(component_linearRGB)
    );
}
*/

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

export function convert_XYZ_to_xyY([X, Y, Z]: number[]) {
  const sum = X + Y + Z;
  return [X / sum, Y / sum, Y];
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

export function transfer_gammaRGB_to_linearRGB(color_sRGB: number[]): number[] {
  const curveThreshold = 0.0031308;
  return color_sRGB.map((component_sRGB: number) =>
    component_sRGB > curveThreshold
      ? Math.pow((component_sRGB + 0.055) / 1.055, 2.4)
      : component_sRGB / 12.92
  );
}

export function gammaCorrect_linearRGB_to_sRGB(
  linearRGB: number[],
  colorSpace: ColorSpace
): number[] {
  const { alpha = 1, gammaLimit = 1, gammaLinear = 1 } = profiles[
    colorSpace
  ].transferParams;

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

  /*
  const threshold: number = 0.04045;
  return linearRGB.map((c: number) =>
    c > threshold ? Math.pow((c + 0.055) / 1.055, 2.4) : (25 * c) / 323
  );
  */
}

//export function
