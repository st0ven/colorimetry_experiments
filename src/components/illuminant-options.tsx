import React from "react"
import {illuminant, Illuminant} from "../helper/color-space"

export function IlluminantOptions() {
	console.log(Illuminant);
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