import React from "react";
import { ColorSpace, RenderSpace, colorSpace } from "../helper/color-space";

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

export function RenderSpaceOptions() {
  return (
    <React.Fragment>
      {Object.keys(RenderSpace).map((renderSpace: string) => (
        <option key={`option-${renderSpace}`} value={renderSpace}>
          {Object(RenderSpace)[renderSpace]}
        </option>
      ))}
    </React.Fragment>
  );
}
