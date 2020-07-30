import { ColorSpace } from "./color-space";

export enum CompandMethod {
  gamma = "gamma",
  sRGB = "sRGB",
  lStar = "lStar",
}

export const transferParams: any = {
  [ColorSpace.sRGB]: {
    alpha: 1.055,
    gamma: 12 / 5,
    method: CompandMethod.sRGB,
  },
  [ColorSpace.adobeRGB]: {
    alpha: 1.099,
    gamma: 20 / 9,
    method: CompandMethod.sRGB,
  },
  [ColorSpace.adobeWideGamut]: {
    alpha: undefined,
    gamma: 563 / 256,
    method: CompandMethod.gamma,
  },
  [ColorSpace.displayP3]: {
    alpha: 1.055,
    gamma: 12 / 5,
    method: CompandMethod.sRGB,
  },
  [ColorSpace.proPhoto]: {
    alpha: 1,
    gamma: 9 / 5,
    method: CompandMethod.sRGB,
  },
};

export const compand: any = {
  gamma: {
    nonLinear(rgbNormalized: number[], sourceColorSpace: ColorSpace) {
      // destructure transfer params from color space
      const { gamma } = transferParams[sourceColorSpace];
      return rgbNormalized.map((v: number) => Math.pow(v, 1 / gamma));
    },
    linear(rgbNormalized: number[], sourceColorSpace: ColorSpace) {
      // destructure transfer params from color space
      const { gamma } = transferParams[sourceColorSpace];
      return rgbNormalized.map((v: number) => Math.pow(v, gamma));
    },
  },
  sRGB: {
    // calculate ksubzero given a colorspace alpha and gamma values
    kSubZero(alpha: number, gamma: number): number {
      return (alpha - 1) / (gamma - 1);
    },
    // forward transformation from linear RGB to nonlinear destination RGB space
    nonLinear(rgbNormalized: number[], sourceColorSpace: ColorSpace): number[] {
      // destructure transfer params from color space
      const { alpha = 1, gamma } = transferParams[sourceColorSpace];

      // fetch variables needed for forward transformatoin calculation
      const kSubZero = compand.sRGB.kSubZero(alpha, gamma);
      const phi = compand.sRGB.phi(alpha, gamma);
      const threshold: number = kSubZero / phi;

      // apply forward transformation
      return rgbNormalized.map((v: number) =>
        v < threshold ? phi * v : alpha * Math.pow(v, 1 / gamma) - (alpha - 1)
      );
    },

    // inverse transformation from source nonlinear RGB space to linear RGB
    linear(rgbNormalized: number[], sourceColorSpace: ColorSpace): number[] {
      // destructure transfer params
      const { alpha = 1, gamma } = transferParams[sourceColorSpace];

      // fetch variables needed for inverse transformation calculations
      const kSubZero = compand.sRGB.kSubZero(alpha, gamma);
      const phi = compand.sRGB.phi(alpha, gamma);
      const threshold: number = kSubZero;

      // apply inverse transformation
      return rgbNormalized.map((V: number) =>
        V <= threshold ? V / phi : Math.pow((V + (alpha - 1)) / alpha, gamma)
      );
    },

    // calculate phi value for transformations given alpha and gamma values for
    // a given color space
    phi(alpha: number, gamma: number): number {
      return (
        (Math.pow(alpha, gamma) * Math.pow(gamma - 1, gamma - 1)) /
        (Math.pow(alpha - 1, gamma - 1) * Math.pow(gamma, gamma))
      );
    },
  },
};
