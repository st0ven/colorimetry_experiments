import React, { useState, useCallback, useRef, ChangeEvent } from "react";
import * as Babylon from "babylonjs";
import styles from "./chromaticity-visualization.module.scss";
import { ColorSpace } from "../helper/color-space";
import { Graph3d, GraphType } from "../components/graph-3d";
import { Select } from "../components/select";
import { ColorSpaceOptions } from "../components/color-space-options";
import { findEntityInList } from "../helper/babylon-entities";
import { renderHemiLight } from "../rendering/lights";
import {
  renderChromaticityPlane,
  renderSpectralLocusXYZ,
} from "../rendering/rgb-chromaticity";

// import CMF data CIE 1931 at 2 degrees - 0.1nm
const XYZ_data = require("../data/cmf_1931_XYZ_0.1nm.csv");

// function to render the spectral locus with a baked in arguments.
// This function is static and does not require any user-defined inputs
// nor any component state to manipulate it..
function render_spectral_locus(scene: Babylon.Scene) {
  renderSpectralLocusXYZ(XYZ_data, scene);
}

export function ChromaticityVisualization() {
  // reference to list of meshes used within the visualization's scene
  const entities: React.MutableRefObject<Array<
    Babylon.Mesh | Babylon.StandardMaterial
  >> = useRef([]);

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
      const newEntities: any = renderChromaticityPlane(
        Object(ColorSpace)[toColorSpace],
        scene,
        entities.current
      );
      newEntities.forEach(
        (newEntity: Babylon.Mesh | Babylon.StandardMaterial) => {
          if (!findEntityInList(entities.current, newEntity.name))
            entities.current.push(newEntity);
        }
      );
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
        renderMethods={[
          renderHemiLight,
          render_spectral_locus,
          renderChromaticityPlaneMesh,
        ]}
      ></Graph3d>
    </React.Fragment>
  );
}
