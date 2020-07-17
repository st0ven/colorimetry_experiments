import {
  invertMatrix,
  scaleMatrix,
  matrixMultiply,
  rotateMatrix,
} from "./coordinate-math";

type Matrix2d = number[][];
type Coordinate2D = [number, number];
type Coordinate3D = [number, number, number];

// chromatic adatpation matricies
export const adaptMatrix_VonKries: Matrix2d = [
    [0.4002, 0.7076, -0.0808],
    [-0.2263, 1.1653, 0.0457],
    [0, 0, 0.9182],
  ],
  adaptMatrix_Bradford: Matrix2d = [
    [0.8951, 0.2664, -0.1614],
    [-0.7502, 1.7135, 0.0367],
    [0.0389, 0.0685, 1.0296],
  ],
  adaptMatrix_XYZ_scale: Matrix2d = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];

const sRGB_r_xyY = [0.64, 0.33],
  sRGB_g_xyY = [0.3, 0.6],
  sRGB_b_xyY = [0.15, 0.06];

export const sRGB_w_xyY = [0.3127, 0.329];

export const sRGB_primaries_xyY: number[][] = [
  sRGB_r_xyY,
  sRGB_g_xyY,
  sRGB_b_xyY,
];

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

/*
 Conversion helper functions that allow for determining tarnsform matrix from some defined color space back into XYZ color space
*/
export function convert_component_xy_to_xyz(xyYCoord: number[]): number[] {
  const [cX, cY] = xyYCoord;
  return [cX, cY, 1 - cX - cY];
}

export function convert_component_xyY_to_XYZ(xyYCoord: number[]): number[] {
  return [
    (xyYCoord[0] * xyYCoord[2]) / xyYCoord[1],
    xyYCoord[2],
    ((1 - xyYCoord[0] - xyYCoord[1]) * xyYCoord[2]) / xyYCoord[1],
  ];
}

export function convert_sRGB_to_XYZ_space(color_sRGB: number[]): number[] {
  const linear_sRGB = gammaCorrect_sRGB_to_linearRGB(color_sRGB);
  const XYZ_transformMatrix = calculate_XYZspace_transformation_matrix(
    sRGB_primaries_xyY,
    sRGB_w_xyY
  );
  return rotateMatrix(
    matrixMultiply(XYZ_transformMatrix, rotateMatrix([linear_sRGB]))
  ).flat();
}

export function convert_XYZ_to_Luv_space(c_XYZ: number[]): number[] {
  const threshold = 216 / 24389;
  const coeff = 24389 / 27;
  const [Xr, Yr, Zr]: number[] = find_wXYZ_from_wxyz(
    convert_component_xy_to_xyz(sRGB_w_xyY)
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

export function convert_XYZ_to_xyY(XYZ_color: number[]) {
  const sum = XYZ_color[0] + XYZ_color[1] + XYZ_color[2];
  return [XYZ_color[0] / sum, XYZ_color[1] / sum, XYZ_color[2] / sum];
}

export function convert_Luv_to_XYZ_space(c_Luv: number[]): number[] {
  const threshold = 216 / 24389;
  const [Xr, Yr, Zr]: number[] = find_wXYZ_from_wxyz(
    convert_component_xy_to_xyz(sRGB_w_xyY)
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

export function gammaCorrect_sRGB_to_linearRGB(color_sRGB: number[]): number[] {
  const curveThreshold = 0.04045;
  return color_sRGB
    .map((component_sRGB: number) => component_sRGB / 255)
    .map((component_sRGB: number) =>
      component_sRGB > curveThreshold
        ? Math.pow((component_sRGB + 0.055) / 1.055, 2.4)
        : component_sRGB / 12.92
    );
}
