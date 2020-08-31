import React from "react";
import { VertexData } from "babylonjs";
import { ColorModel, ColorSpace, Illuminant } from "@lib/enums";

export interface StoreShape {
  colorSpace: ColorSpace;
  fidelity: number;
  geometry?: VertexData;
  sourceColorModel: ColorModel;
  targetColorModel: ColorModel;
  waiting: boolean;
  whitepoint: Illuminant;
}

export interface StoreContextShape {
  store: StoreShape;
  dispatch?: React.Dispatch<StoreActionShape>;
}

export interface StoreActionShape {
  name: string;
  value: unknown;
}

export function storeReducer(
  store: StoreShape,
  action: StoreActionShape
): StoreShape {
  const { name, value } = action;

  switch (name) {
    case "setFidelity":
      return Object.assign({}, store, { fidelity: value });
    case "setGeometry":
      return Object.assign({}, store, { geometry: value });
    case "setColorSpace":
      return Object.assign({}, store, { colorSpace: value });
    case "setTargetColorModel":
      return Object.assign({}, store, { targetColorModel: value });
    case "setWaiting":
      console.log("set wait", value);
      return Object.assign({}, store, { waiting: value });
    case "setWhitepoint":
      return Object.assign({}, store, { whitepoint: value });
    default:
      console.warn(
        `unable to update store for property ${name} with value ${value}`
      );
      return store;
  }
}

export const initialStore: StoreShape = {
  fidelity: Math.pow(2, 3),
  colorSpace: ColorSpace.sRGB,
  sourceColorModel: ColorModel.RGB,
  targetColorModel: ColorModel.XYZ,
  waiting: false,
  whitepoint: Illuminant.D65,
};

export const StoreContext: React.Context<StoreContextShape> = React.createContext(
  { store: initialStore }
);
