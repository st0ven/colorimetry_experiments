import React from "react";
import { Illuminant } from "../../lib/color-space";

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
