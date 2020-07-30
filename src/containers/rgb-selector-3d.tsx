import React, { useRef, useState, useCallback } from "react";
import * as Babylon from "babylonjs";
import styles from "./rgb-selector-3d.module.scss";
import { Graph3d } from "../components/graph-3d";
import { ColorSpaceOptions } from "../components/color-space-options";
import { IlluminantOptions } from "../components/illuminant-options";
import { ColorComponent } from "../components/color-component-input";
import { ColorSpace, Illuminant } from "../helper/color-space";
import {
  renderHemiLight,
  renderColorSpace,
  renderRGBPoint,
} from "../helper/babylon-render";

export function RGBSelector3D() {
  // reference collection of scene entities relevant to this visualization
  const sceneEntities: React.MutableRefObject<Array<any>> = useRef<Array<any>>(
    []
  );

  // stateful variables relating to user input
  const [currentSpace, setCurrentSpace] = useState<string>(ColorSpace.sRGB);
  const [redComponent, setRedComponent] = useState<number>(1);
  const [greenComponent, setGreenComponent] = useState<number>(1);
  const [blueComponent, setBlueComponent] = useState<number>(1);
  const [referenceIlluminant, setReferenceIlluminant] = useState<string>(
    Illuminant.D50
  );

  // update the state to reflect the selection of which color profile to visualize
  const changeProfileForColorSpace = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target;
      setCurrentSpace(value);
    },
    []
  );

  const changeReferenceIlluminant = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target;
      setReferenceIlluminant(value);
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

  const registerEntities = useCallback(
    (entities: any | any[]) => {
      sceneEntities.current = sceneEntities.current.concat(entities);
    },
    [sceneEntities]
  );

  // render a single point as a sphere within the visualization
  const renderPointMesh = useCallback(
    (scene: Babylon.Scene) => {
      // invoke the rendering method to draw a point indicator
      const returnedEntities: any[] = renderRGBPoint(
        [redComponent, greenComponent, blueComponent],
        Object(ColorSpace)[currentSpace],
        Object(Illuminant)[referenceIlluminant],
        scene,
        sceneEntities.current
      );

      // register any entities created to the list of entity references array
      if (!sceneEntities.current.length) registerEntities(returnedEntities);
    },
    [
      redComponent,
      greenComponent,
      blueComponent,
      currentSpace,
      referenceIlluminant,
      registerEntities,
      sceneEntities,
    ]
  );

  // render the color space mesh given a selected color space
  const renderColorSpaceMesh = useCallback(
    (scene: Babylon.Scene) => {
      renderColorSpace(
        "color-space",
        Object(ColorSpace)[currentSpace],
        Object(Illuminant)[referenceIlluminant],
        scene
      );
    },
    [currentSpace, referenceIlluminant]
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
      <label htmlFor={`illuminant options`}>reference white point</label>
      <select
        id={`illuminant options`}
        className={styles.colorSpaceSelector}
        onChange={changeReferenceIlluminant}
        defaultValue={referenceIlluminant}
      >
        <IlluminantOptions />
      </select>
      <Graph3d
        className={styles.bottomSpacer}
        renderMethods={[renderHemiLight, renderColorSpaceMesh, renderPointMesh]}
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
