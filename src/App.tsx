import React, { useState, useCallback, ChangeEvent, useMemo } from "react";
import styles from "./App.module.scss";
import { Graph3d } from "./components/graph-3d";
import { ColorSpace, colorSpace } from "./helper/color-space";
import {
  renderColorSpace,
  renderProfileChromaticityPlane,
  renderSpectralLocusXYZ,
} from "./helper/babylon-render";
import * as Babylon from "babylonjs";

// import CMF data CIE 1931 at 2 degrees - 0.1nm
const XYZ_data = require("./data/cmf_1931_XYZ_0.1nm.csv");

// dictionary of mesh names
export const meshNames: any = {
  locus: "spectral_locus",
  chromaticPlane: "chromaticity_plane",
  colorSpace: "color_space",
};

// render hemisphere light to 3d graphs
function renderHemiLight(scene: Babylon.Scene) {
  // lighting instantitation
  const light: Babylon.HemisphericLight = new Babylon.HemisphericLight(
    "hemi1",
    new Babylon.Vector3(0, 20, 0),
    scene
  );
  light.diffuse = new Babylon.Color3(1, 1, 1);
  light.groundColor = new Babylon.Color3(1, 1, 1);
  light.specular = new Babylon.Color3(0, 0, 0);
}

// create an object and map ColorSpace keys which invoke rendering function
// to plot the chormatic plane corresponding to the colorspace name
const renderChromaticityPlane: any = {};
Object.keys(ColorSpace).map((colorSpaceName: string) => {
  renderChromaticityPlane[colorSpaceName] = (scene: Babylon.Scene) => {
    renderProfileChromaticityPlane(
      meshNames.chromaticPlane,
      Object(ColorSpace)[colorSpaceName],
      scene
    );
  };
});

// create an object and map ColorSpace keys which invoke rendering function
// to plot the color space as a polygon plotted within XYZ space
const renderColorSpaceMesh: any = {};
Object.keys(ColorSpace).map(
  (colorSpaceName: string) =>
    (renderColorSpaceMesh[colorSpaceName] = (scene: Babylon.Scene) => {
      renderColorSpace(
        meshNames.colorSpace,
        Object(ColorSpace)[colorSpaceName],
        scene
      );
    })
);

// function to render the spectral locus with a baked in arguments
function render_spectral_locus(scene: Babylon.Scene) {
  renderSpectralLocusXYZ(meshNames.locus, XYZ_data, scene);
}

// Main application component
function App() {
  // hold state for the selected color spaces across our demo 3d graphs
  const [spectralMeshName, setSpectralMeshName] = useState<string>(
    ColorSpace.sRGB
  );
  const [colorSpaceName, setcolorSpaceName] = useState<string>(
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
  const changeProfileForColorSpace = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target;
      setcolorSpaceName(value);
    },
    []
  );

  // populate a list of color space options within an <Option> tag as mapped
  // against the keys of the ColorSpace enum
  const colorSpaceOptions = useMemo((): React.ReactNode => {
    return Object.keys(ColorSpace).map((colorSpaceName: string) => (
      <option key={`option-${colorSpaceName}`} value={colorSpaceName}>
        {colorSpace[colorSpaceName].label}
      </option>
    ));
  }, []);

  // render output
  return (
    <div className={styles.app}>
      <section className={styles.chromaticitySection}>
        <select
          className={styles.colorSpaceSelector}
          onChange={changeProfileForChromaticity}
          defaultValue={spectralMeshName}
        >
          {colorSpaceOptions}
        </select>
        <Graph3d
          //axisLabels={["x", "Y", "y"]}
          lights={[renderHemiLight]}
          meshes={[
            render_spectral_locus,
            renderChromaticityPlane[spectralMeshName],
          ]}
        ></Graph3d>
      </section>
      <section>
        <label htmlFor={`space options`}>source color space</label>
        <select
          id={`space options`}
          className={styles.colorSpaceSelector}
          onChange={changeProfileForColorSpace}
          defaultValue={spectralMeshName}
        >
          {colorSpaceOptions}
        </select>
        <Graph3d
          lights={[renderHemiLight]}
          meshes={[renderColorSpaceMesh[colorSpaceName]]}
        ></Graph3d>
      </section>
    </div>
  );
}

export default App;
