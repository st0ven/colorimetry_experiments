import { ColorModel, ColorSpace, GraphType, Illuminant } from "@lib/enums";

// chromatic adatpation matricies
export const adaptations = {
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

interface ColorModelMapItem {
  // determines how components of this model should map to a cubic color space.
  // example, L components typically map to 'height', which is on the Y axis on XYZ space.
  axisOrder?: number[];
  // How should this space be mapped? does it use euclidean or polar coordinates?
  graphType: GraphType;
  // when colors in this space are normalized, which options to pass to the normalization function
  normalizeOptions?: ColorModelMapItemNornalOptions;
  // for each component, define the max and min values to expect for graphing and normalizing purposes
  range: number[][];
}

export interface ColorModelMapItemNornalOptions {
  useAbsoluteValues: boolean;
  useColorModel?: ColorModel;
}

// Map describing available color models to plot rgb color spaces within
export const colorModelMap: Map<ColorModel, ColorModelMapItem> = new Map([
  [
    ColorModel.LAB,
    {
      axisOrder: [1, 0, 2],
      graphType: GraphType.box,
      range: [
        [0, 100],
        [-200, 200],
        [-200, 200],
      ],
    },
  ],
  [
    ColorModel.LCHab,
    {
      graphType: GraphType.cylindrical,
      normalizeOptions: {
        useAbsoluteValues: true,
      },
      range: [
        [0, 100],
        [0, 200],
        [0, 360],
      ],
    },
  ],
  [
    ColorModel.LCHuv,
    {
      //axisOrder: [1, 0, 2],
      graphType: GraphType.cylindrical,
      normalizeOptions: {
        useAbsoluteValues: true,
      },
      range: [
        [0, 100],
        [0, 400],
        [0, 360],
      ],
    },
  ],
  [
    ColorModel.LUV,
    {
      axisOrder: [1, 0, 2],
      graphType: GraphType.box,
      range: [
        [0, 100],
        [-134, 220],
        [-140, 122],
      ],
    },
  ],
  [
    ColorModel.RGB,
    {
      graphType: GraphType.box,
      range: [
        [0, 255],
        [0, 255],
        [0, 255],
      ],
    },
  ],
  [
    ColorModel.XYZ,
    {
      graphType: GraphType.box,
      range: [
        [0, 1],
        [0, 1],
        [0, 1],
      ],
    },
  ],
  [
    ColorModel.xyY,
    {
      graphType: GraphType.box,
      range: [
        [0, 1],
        [0, 1],
        [0, 1],
      ],
    },
  ],
]);

/*
 * Color Space
 * Spaces within RGB model which represent a range/gamut of visible colors relative
 * to a spectrum of visible colors as defined by color-matching functions.
 */
interface ColorSpaceProps {
  depth: number; // bit depth suggested for the particular color space
  illuminant: Illuminant; // the default whitepoint to use for this color space
  label: string; // a label to use when describing this space
  primaries: number[][]; // a set of chromatic primaries for each r, g & b component
}

export const colorSpaceMap: Map<ColorSpace, ColorSpaceProps> = new Map([
  [
    ColorSpace.adobeRGB,
    {
      depth: 8,
      illuminant: Illuminant.D65,
      label: "Adobe RGB 1998",
      primaries: [
        [0.64, 0.33],
        [0.21, 0.71],
        [0.15, 0.06],
      ],
    },
  ],
  [
    ColorSpace.adobeWideGamut,
    {
      depth: 16,
      illuminant: Illuminant.D50,
      label: "Adobe Wide Gamut",
      primaries: [
        [0.7347, 0.2653],
        [0.1152, 0.8264],
        [0.1566, 0.0177],
      ],
    },
  ],
  [
    ColorSpace.appleRGB,
    {
      depth: 16,
      illuminant: Illuminant.D65,
      label: "Apple RGB",
      primaries: [
        [0.625, 0.34],
        [0.28, 0.595],
        [0.155, 0.07],
      ],
    },
  ],
  [
    ColorSpace.displayP3,
    {
      depth: 8,
      illuminant: Illuminant.D65,
      label: "Display P3",
      primaries: [
        [0.68, 0.32],
        [0.265, 0.69],
        [0.15, 0.06],
      ],
    },
  ],
  [
    ColorSpace.proPhoto,
    {
      depth: 16,
      illuminant: Illuminant.D50,
      label: "ProPhoto",
      primaries: [
        [0.734699, 0.265301],
        [0.159597, 0.840403],
        [0.036598, 0.000105],
      ],
    },
  ],
  [
    ColorSpace.sRGB,
    {
      depth: 8,
      illuminant: Illuminant.D65,
      label: "sRGB",
      primaries: [
        [0.64, 0.33],
        [0.3, 0.6],
        [0.15, 0.06],
      ],
    },
  ],
]);

// Map of standard illuminants describing their positions within XYZ space
export const illuminantMap: Map<Illuminant, number[]> = new Map([
  [Illuminant.A, [1.0985, 1, 0.35585]],
  [Illuminant.B, [0.99072, 1, 0.85223]],
  [Illuminant.C, [0.98074, 1, 1.18232]],
  [Illuminant.D50, [0.96422, 1, 0.82521]],
  [Illuminant.D55, [0.95682, 1, 0.92149]],
  [Illuminant.D65, [0.95047, 1, 1.08883]],
  [Illuminant.D75, [0.94972, 1, 1.22638]],
  [Illuminant.E, [1, 1, 1]],
  [Illuminant.F2, [0.99186, 1, 0.67393]],
  [Illuminant.F7, [0.95041, 1, 1.08747]],
  [Illuminant.F11, [1.00962, 1, 0.6435]],
]);

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

// given a color model, define the min/max ranges for each model component
export const normalRanges = {
  [ColorModel.LAB]: {
    L: [0, 100],
    A: [-200, 200],
    B: [-200, 200],
  },
  [ColorModel.LUV]: {
    L: [0, 100],
    U: [-134, 220],
    V: [-140, 122],
  },
  [ColorModel.LCHuv]: {
    L: [0, 100],
    C: [0, 400],
    H: [0, 360],
  },
  [ColorModel.XYZ]: {
    X: [0, 1],
    Y: [0, 1],
    Z: [0, 1],
  },
};
