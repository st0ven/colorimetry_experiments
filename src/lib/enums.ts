export enum Axis {
  X = "X",
  Y = "Y",
  Z = "Z",
}

export enum AxisType {
  "cubic" = "cubic",
  "polar" = "polar",
}

export enum ColorSpace {
  adobeRGB = "adobeRGB",
  adobeWideGamut = "adobeWideGamut",
  appleRGB = "appleRGB",
  displayP3 = "displayP3",
  proPhoto = "proPhoto",
  sRGB = "sRGB",
}

export enum ColorModel {
  LAB = "LAB",
  LCHab = "LCHab",
  LCHuv = "LCHuv",
  LUV = "LUV",
  RGB = "RGB",
  XYZ = "XYZ",
  xyY = "xyY",
}

// enumeration of different companding algorithms to be used
export enum CompandMethod {
  gamma = "gamma",
  sRGB = "sRGB",
  lStar = "lStar",
}

// a collection of mesh fidelity options defined as the number of vertices to
// create for any given cube fase of the reference vertex data.
export enum FidelityLevels {
  low = Math.pow(2, 3),
  medium = Math.pow(2, 4),
  high = Math.pow(2, 5),
}

export enum GraphType {
  box = "box",
  cylindrical = "cylindrical",
}

export enum Illuminant {
  A = "A",
  B = "B",
  C = "C",
  D50 = "D50",
  D55 = "D55",
  D65 = "D65",
  D75 = "D75",
  E = "E",
  F2 = "F2",
  F7 = "F7",
  F11 = "F11",
}
