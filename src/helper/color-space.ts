import { compand_RGB_XYZ_Space } from "./color-profile-conversion";

export enum ColorSpace {
  adobeRGB = "adobeRGB",
  adobeWideGamut = "adobeWideGamut",
  //appleRGB = "appleRGB",
  displayP3 = "displayP3",
  proPhoto = "proPhoto",
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

export const colorSpace: any = {
  [ColorSpace.adobeRGB]: {
    convertFromReferenceSpace: (color_xyz: number[], colorSpace: ColorSpace) =>
      compand_RGB_XYZ_Space(color_xyz, colorSpace, true),
    convertToReferenceSpace: compand_RGB_XYZ_Space,
    illuminant: illuminant[Illuminant.D65],
    label: "Adobe RGB 1998",
    primaries: [
      [0.64, 0.33],
      [0.21, 0.71],
      [0.15, 0.06],
    ],
    transferParams: {
      alpha: 1,
      beta: 0,
      beta_rho: 0,
      gammaLimit: 563 / 256,
      gammaLinear: 1.8,
    },
  },
  [ColorSpace.adobeWideGamut]: {
    convertFromReferenceSpace: (color_xyz: number[], colorSpace: ColorSpace) =>
      compand_RGB_XYZ_Space(color_xyz, colorSpace, true),
    convertToReferenceSpace: compand_RGB_XYZ_Space,
    illuminant: illuminant[Illuminant.D50],
    label: "Adobe Wide Gamut",
    primaries: [
      [0.7347, 0.2653],
      [0.1152, 0.8264],
      [0.1566, 0.0177],
    ],
    transferParams: {
      alpha: 1,
      beta: 0,
      beta_rho: 0,
      gammaLimit: 536 / 256,
      gammaLinear: 2.2,
    },
  },
  /*
  [ColorSpace.appleRGB]: {
    convertFromReferenceSpace: (color_xyz: number[], colorSpace: ColorSpace) =>
      compand_RGB_XYZ_Space(color_xyz, colorSpace, true),
    convertToReferenceSpace: compand_RGB_XYZ_Space,
    illuminant: illuminant[Illuminant.D65],
    label: "Apple RGB",
    primaries: [
      [0.625, 0.34],
      [0.28, 0.595],
      [0.155, 0.07],
    ],
    transferParams: {
      alpha: 1,
      beta: 0,
      beta_rho: 0,
      gammaLimit: 536 / 256,
      gammaLinear: 1.8,
    },
  },
  */
  [ColorSpace.displayP3]: {
    convertFromReferenceSpace: (color_xyz: number[], colorSpace: ColorSpace) =>
      compand_RGB_XYZ_Space(color_xyz, colorSpace, true),
    convertToReferenceSpace: compand_RGB_XYZ_Space,
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
  [ColorSpace.proPhoto]: {
    convertFromReferenceSpace: (color_xyz: number[], colorSpace: ColorSpace) =>
      compand_RGB_XYZ_Space(color_xyz, colorSpace, true),
    convertToReferenceSpace: compand_RGB_XYZ_Space,
    illuminant: illuminant[Illuminant.D50],
    label: "ProPhoto",
    primaries: [
      [0.7347, 0.2653],
      [0.1596, 0.8404],
      [0.0366, 0.0001],
    ],
    transferParams: {
      alpha: 1,
      gammaLimit: 9 / 5,
      gammaLinear: 2.2,
    },
  },
  [ColorSpace.sRGB]: {
    convertFromReferenceSpace: (color_xyz: number[], colorSpace: ColorSpace) =>
      compand_RGB_XYZ_Space(color_xyz, colorSpace, true),
    convertToReferenceSpace: compand_RGB_XYZ_Space,
    illuminant: illuminant[Illuminant.D65],
    label: "sRGB",
    primaries: [
      [0.64, 0.33],
      [0.3, 0.6],
      [0.15, 0.06],
    ],
    transferParams: {
      alpha: 1.055,
      beta: 0.0031308,
      beta_rho: 0.04045,
      gammaLimit: 12 / 5,
      gammaLinear: 2.2,
    },
  },
};

// defines primary color points for red, green, blue, yellow, cyan, magenta
// as represented in scale from 0 - 1.
export const XYZ_primaries: number[][] = [
  [1, 0, 0], // red
  [1, 1, 0], // yellow
  [0, 1, 0], // green
  [0, 1, 1], // magenta
  [0, 0, 1], // blue
  [1, 0, 1], // cyan
];
