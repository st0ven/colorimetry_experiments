import React from "react";
import { ColorSpace, ReferenceSpace, colorSpace } from "../helper/color-space";

// populate a list of color space options within an <Option> tag as mapped
// against the keys of the ColorSpace enum
export function ColorSpaceOptions() {
  return (
    <React.Fragment>
      {Object.keys(ColorSpace).map((currentSpace: string) => (
        <option key={`option-${currentSpace}`} value={currentSpace}>
          {colorSpace[currentSpace].label}
        </option>
      ))}
    </React.Fragment>
  );
}

export function ReferenceSpaceOptions() {
  return (
    <React.Fragment>
      <option value={ReferenceSpace.LCHuv}>{ReferenceSpace.LCHuv}</option>
      <option value={ReferenceSpace.XYZ}>{ReferenceSpace.XYZ}</option>
    </React.Fragment>
  );
}
