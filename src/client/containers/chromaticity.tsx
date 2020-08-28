import React, { useState, useCallback, ChangeEvent } from "react";
import * as Babylon from "babylonjs";
import styles from "./chromaticity.module.scss";
import { ColorSpace, ColorModel } from "@lib/enums";
import { Graph3d } from "@components/graph-3d";
import { GraphType } from "@lib/enums";
import { Select } from "@components/select";
import { ColorSpaceOptions } from "@components/color-space-options";
import { renderHemiLight } from "@rendering/lights";
import { axisOptionsMap } from "@lib/constants.axes";
import {
  renderChromaticityPlane,
  renderSpectralLocusXYZ,
} from "@rendering/rgb-chromaticity";

// import CMF data CIE 1931 at 2 degrees - 0.1nm
const XYZ_data = require("@res/cmf_1931_XYZ_0.1nm.csv");

// function to render the spectral locus with a baked in arguments.
// This function is static and does not require any user-defined inputs
// nor any component state to manipulate it..
function render_spectral_locus(scene: Babylon.Scene) {
  renderSpectralLocusXYZ(XYZ_data, scene);
}

export function ChromaticityVisualization() {
  // hold state for the selected color spaces across our demo 3d graphs
  const [toColorSpace, setColorSpace] = useState<ColorSpace>(ColorSpace.sRGB);

  // callbacks which control the stateful values which hold reference to the current
  // color space selected via dropdown
  const changeColorSpace = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target;
      setColorSpace(Object(ColorSpace)[value]);
    },
    []
  );

  const renderChromaticityPlaneMesh = useCallback(
    (scene: Babylon.Scene) => {
      renderChromaticityPlane(Object(ColorSpace)[toColorSpace], scene);
    },
    [toColorSpace]
  );

  return (
    <React.Fragment>
      <header className={styles.header}>
        <Select
          className={styles.colorSpaceSelector}
          onChange={changeColorSpace}
          id="chromaticity-color-space"
          label="color space"
          initialValue={toColorSpace}
        >
          <ColorSpaceOptions />
        </Select>
      </header>

      <Graph3d
        type={GraphType.box}
        axisOptions={axisOptionsMap.get(ColorModel.XYZ)}
        renderMethods={[
          renderHemiLight,
          render_spectral_locus,
          renderChromaticityPlaneMesh,
        ]}
      ></Graph3d>
    </React.Fragment>
  );
}
