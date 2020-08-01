import React, { useRef, useState, useCallback } from "react";
import * as Babylon from "babylonjs";
import styles from "./rgb-visualization.module.scss";
import { Graph3d } from "../components/graph-3d";
import { Select } from "../components/select";
import { ColorSpaceOptions } from "../components/color-space-options";
import { IlluminantOptions } from "../components/illuminant-options";
import { ColorComponent } from "../components/color-component-input";
import { ColorSpace, Illuminant } from "../helper/color-space";
import { renderHemiLight } from "../rendering/lights";
import { renderColorSpace, renderRGBPoint } from "../rendering/rgb-color-space";

export function RGBVisualization() {
  // reference collection of scene entities relevant to this visualization
  const sceneEntities: React.MutableRefObject<Array<any>> = useRef<Array<any>>(
    []
  );

  // stateful variables relating to user input
  const [toColorSpace, setColorSpace] = useState<string>(ColorSpace.sRGB);
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
      setColorSpace(value);
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
        Object(ColorSpace)[toColorSpace],
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
      toColorSpace,
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
        Object(ColorSpace)[toColorSpace],
        Object(Illuminant)[referenceIlluminant],
        scene
      );
    },
    [toColorSpace, referenceIlluminant]
  );

  // render the container
  return (
    <React.Fragment>
      <header className={styles.header}>
        <Select
          className={styles.colorSpaceSelector}
          onChange={changeProfileForColorSpace}
          id="space options"
          label="color space"
          initialValue={toColorSpace}
        >
          <ColorSpaceOptions />
        </Select>
        <Select
          className={styles.colorSpaceSelector}
          onChange={changeReferenceIlluminant}
          id="illuminant options"
          label="reference illuminant"
          initialValue={referenceIlluminant}
        >
          <IlluminantOptions />
        </Select>
      </header>

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
