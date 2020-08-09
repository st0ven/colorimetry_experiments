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
      {Object.keys(ReferenceSpace).map((space: string) => (
        <option key={`option-${space}`} value={space}>
          {Object(ReferenceSpace)[space]}
        </option>
      ))}
    </React.Fragment>
  );
}
