import React from "react";
import { colorSpaceMap } from "@lib/constants.color";
import { ColorModel, ColorSpace, Illuminant } from "@lib/enums";

// populate a list of color space options within an <Option> tag as mapped
// against the keys of the ColorSpace enum
export function ColorSpaceOptions() {
  return (
    <React.Fragment>
      {Object.keys(ColorSpace).map((currentSpace: string) => (
        <option key={`option-${currentSpace}`} value={currentSpace}>
          {colorSpaceMap.get(Object(ColorSpace)[currentSpace])?.label}
        </option>
      ))}
    </React.Fragment>
  );
}

export function ColorModelOptions() {
  return (
    <React.Fragment>
      <option value={ColorModel.LAB}>{ColorModel.LAB}</option>
      <option value={ColorModel.LCHab}>{ColorModel.LCHab}</option>
      <option value={ColorModel.LCHuv}>{ColorModel.LCHuv}</option>
      <option value={ColorModel.LUV}>{ColorModel.LUV}</option>
      <option value={ColorModel.XYZ}>{ColorModel.XYZ}</option>
    </React.Fragment>
  );
}

export function IlluminantOptions() {
  return (
    <React.Fragment>
      {Object.keys(Illuminant).map((targetIlluminant: string) => (
        <option key={`option-${targetIlluminant}`} value={targetIlluminant}>
          {Object(Illuminant)[targetIlluminant]}
        </option>
      ))}
    </React.Fragment>
  );
}
