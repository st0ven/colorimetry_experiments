import React, { useState, useCallback, ChangeEvent, useMemo } from "react";
import styles from "./App.module.scss";
import { Graph3d } from "./components/graph-3d";
import { ColorSpaceOptions } from "./components/color-space-options";
import { RGBSelector3D } from "./containers/rgb-selector-3d";
import { ColorSpace } from "./helper/color-space";
import {
  renderProfileChromaticityPlane,
  renderSpectralLocusXYZ,
  renderHemiLight,
} from "./helper/babylon-render";
import * as Babylon from "babylonjs";

// import CMF data CIE 1931 at 2 degrees - 0.1nm
const XYZ_data = require("./data/cmf_1931_XYZ_0.1nm.csv");

// function to render the spectral locus with a baked in arguments
function render_spectral_locus(scene: Babylon.Scene) {
  renderSpectralLocusXYZ("spectral-locus", XYZ_data, scene);
}

// Main application component
function App() {
  // hold state for the selected color spaces across our demo 3d graphs
  const [spectralMeshName, setSpectralMeshName] = useState<string>(
    ColorSpace.sRGB
  );

  // callbacks which control the stateful values which hold reference to the current
  // color space selected via dropdown
  const changeProfileForChromaticity = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target;
      setSpectralMeshName(value);
    },
    []
  );

  const renderChromaticityPlaneMesh = useCallback(
    (scene: Babylon.Scene) => {
      renderProfileChromaticityPlane(
        "chromaticity-plane",
        Object(ColorSpace)[spectralMeshName],
        scene
      );
    },
    [spectralMeshName]
  );

  // render output
  return (
    <div className={styles.app}>
      <section className={styles.chromaticitySection}>
        <select
          className={styles.colorSpaceSelector}
          onChange={changeProfileForChromaticity}
          defaultValue={spectralMeshName}
        >
          <ColorSpaceOptions />
        </select>
        <Graph3d
          //axisLabels={["x", "Y", "y"]}
          lights={[renderHemiLight]}
          meshes={[render_spectral_locus, renderChromaticityPlaneMesh]}
        ></Graph3d>
      </section>
      <section>
        <RGBSelector3D />
      </section>
    </div>
  );
}

export default App;
