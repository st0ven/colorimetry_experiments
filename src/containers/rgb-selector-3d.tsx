import React, { useState, useCallback } from "react";
import * as Babylon from "babylonjs";
import styles from "./rgb-selector-3d.module.scss";
import { Graph3d } from "../components/graph-3d";
import { ColorSpaceOptions } from "../components/color-space-options";
import { ColorComponent } from "../components/color-component-input";
import { ColorSpace } from "../helper/color-space";
import {
  renderHemiLight,
  renderColorSpace,
  renderRGBPoint,
} from "../helper/babylon-render";

export function RGBSelector3D() {
  const [currentSpace, setCurrentSpace] = useState<string>(ColorSpace.sRGB);
  const [redComponent, setRedComponent] = useState<number>(1);
  const [greenComponent, setGreenComponent] = useState<number>(0);
  const [blueComponent, setBlueComponent] = useState<number>(0);

	// update the state to reflect the selection of which color profile to visualize
  const changeProfileForColorSpace = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target;
      setCurrentSpace(value);
    },
    []
  );

  // update of component callbacks
  const handleRedComponentChange = useCallback((value: number) => {
    setRedComponent(value / 255);
  }, []);
  // update of component callbacks
  const handleGreenComponentChange = useCallback((value: number) => {
    setGreenComponent(value / 255);
  }, []);
  // update of component callbacks
  const handleBlueComponentChange = useCallback((value: number) => {
    setBlueComponent(value / 255);
  }, []);

	// render a single point as a sphere within the visualization
  const renderPointMesh = useCallback(
    (scene: Babylon.Scene) => {
      renderPointAtLocation(
        [redComponent, greenComponent, blueComponent],
        Object(ColorSpace)[currentSpace],
        scene
      );
    },
    [redComponent, greenComponent, blueComponent, currentSpace]
  );

	// render the color space mesh given a selected color space
  const renderColorSpaceMesh = useCallback(
    (scene: Babylon.Scene) => {
      renderColorSpace("color-space", Object(ColorSpace)[currentSpace], scene);
    },
    [currentSpace]
  );

	// render the container
  return (
    <React.Fragment>
      <label htmlFor={`space options`}>source color space</label>
      <select
        id={`space options`}
        className={styles.colorSpaceSelector}
        onChange={changeProfileForColorSpace}
        defaultValue={currentSpace}
      >
        <ColorSpaceOptions />
      </select>
      <Graph3d
        className={styles.bottomSpacer}
        lights={[renderHemiLight]}
        meshes={[renderColorSpaceMesh, renderPointMesh]}
      ></Graph3d>
      <ColorComponent
        className={styles.colorComponent}
        initialValue={Math.round(redComponent * 255)}
        onChange={handleRedComponentChange}
      ></ColorComponent>
      <ColorComponent
        className={styles.colorComponent}
        initialValue={Math.round(greenComponent * 255)}
        onChange={handleGreenComponentChange}
      ></ColorComponent>
      <ColorComponent
        className={styles.colorComponent}
        initialValue={Math.round(blueComponent * 255)}
        onChange={handleBlueComponentChange}
      ></ColorComponent>
    </React.Fragment>
  );
}

function renderPointAtLocation(
  normalizedPoint: number[],
  inColorSpace: ColorSpace,
  scene: Babylon.Scene
) {
  renderRGBPoint(
    normalizedPoint,
    Object(ColorSpace)[inColorSpace],
    scene
  );
}
