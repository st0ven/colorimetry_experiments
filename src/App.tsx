import React, { useState, useCallback, ChangeEvent, useMemo } from "react";
import styles from "./App.module.scss";
import { Graph3d } from "./components/graph-3d";
import { ColorSpace, profiles } from "./helper/color-profile-conversion";
import {
  renderColorSpace,
  renderProfileChromaticityPlane,
  renderSpectralLocusXYZ,
} from "./helper/babylon-render";
import * as Babylon from "babylonjs";

const XYZ_data = require("./data/cmf_1931_XYZ_0.1nm.csv");
export const meshNames: any = {
  locus: "spectral_locus",
  chromaticPlane: "chromaticity_plane",
  colorSpace: "color_space",
};

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

function renderChromaticityPlaneWithSpace(
  colorSpace: ColorSpace,
  scene: Babylon.Scene
) {
  renderProfileChromaticityPlane(meshNames.chromaticPlane, colorSpace, scene);
}

const renderChromaticityPlane: any = {
  sRGB(scene: Babylon.Scene) {
    renderChromaticityPlaneWithSpace(ColorSpace.sRGB, scene);
  },

  adobeRGB(scene: Babylon.Scene) {
    renderChromaticityPlaneWithSpace(ColorSpace.adobeRGB, scene);
  },

  appleRGB(scene: Babylon.Scene) {
    //renderChromaticityPlaneWithSpace(ColorSpace.appleRGB, scene);
  },

  adobeWideGamut(scene: Babylon.Scene) {
    renderChromaticityPlaneWithSpace(ColorSpace.adobeWideGamut, scene);
  },

  displayP3(scene: Babylon.Scene) {
    renderChromaticityPlaneWithSpace(ColorSpace.displayP3, scene);
  },

  proPhoto(scene:Babylon.Scene){
    renderChromaticityPlaneWithSpace(ColorSpace.proPhoto, scene);
  }
};

const renderColorSpaceMesh: any = {
  sRGB(scene: Babylon.Scene) {
    renderColorSpace(meshNames.colorSpace, ColorSpace.sRGB, scene);
  },
  adobeRGB(scene: Babylon.Scene) {
    renderColorSpace(meshNames.colorSpace, ColorSpace.adobeRGB, scene);
  },
  appleRGB(scene: Babylon.Scene) {
    //renderColorSpace(meshNames.colorSpace, ColorSpace.appleRGB, scene);
  },
  adobeWideGamut(scene: Babylon.Scene) {
    renderColorSpace(meshNames.colorSpace, ColorSpace.adobeWideGamut, scene);
  },
  displayP3(scene: Babylon.Scene) {
    renderColorSpace(meshNames.colorSpace, ColorSpace.displayP3, scene);
  },
  proPhoto(scene: Babylon.Scene) {
    renderColorSpace(meshNames.colorSpace, ColorSpace.proPhoto, scene);
  },
};

function render_spectral_locus(scene: Babylon.Scene) {
  renderSpectralLocusXYZ(meshNames.locus, XYZ_data, scene);
}

function App() {
  const [spectralMeshName, setSpectralMeshName] = useState<string>(
    ColorSpace.sRGB
  );
  const [colorSpace, setColorSpace] = useState<string>(ColorSpace.sRGB);

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
      setColorSpace(value);
    },
    []
  );

  const colorSpaceOptions = useMemo((): React.ReactNode => {
    return Object.keys(ColorSpace).map((colorSpace: string) => (
      <option key={`option-${colorSpace}`} value={colorSpace}>
        {profiles[colorSpace].label}
      </option>
    ));
  }, []);

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
          meshes={[renderColorSpaceMesh[colorSpace]]}
        ></Graph3d>
      </section>
    </div>
  );
}

export default App;
