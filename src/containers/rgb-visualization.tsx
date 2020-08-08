import React, { useState, useCallback } from "react";
import * as Babylon from "babylonjs";
import styles from "./rgb-visualization.module.scss";
import { Graph3d, GraphType, GraphAxisOptions } from "../components/graph-3d";
import { Select } from "../components/select";
import {
  ColorSpaceOptions,
  RenderSpaceOptions,
} from "../components/color-space-options";
import { IlluminantOptions } from "../components/illuminant-options";
import { ColorComponent } from "../components/color-component-input";
import { ColorSpace, Illuminant, RenderSpace } from "../helper/color-space";
import { renderHemiLight } from "../rendering/lights";
import {
  renderColorSpace,
  renderRGBPoint,
  renderRGBinLUV,
} from "../rendering/rgb-color-space";
import { AxisRenderOptions } from "src/rendering/axes";

const axisOptionsL: AxisRenderOptions = {
  scalarMin: 0,
  scalarMax: 100,
  markers: 4,
  floatPoint: 0,
  axisLabel: "L",
  axisOrigin: new Babylon.Vector3(0, 0, 1),
};

const axisOptionsC: AxisRenderOptions = {
  axisLabel: "C",
  markers: 4,
  max: 1,
  floatPoint: 0,
  scalarMin: 0,
  scalarMax: 200,
};

const axisOptionsH: AxisRenderOptions = {
  axisLabel: "h",
  markers: 18,
  radius: 1,
};

const cylindricalAxesOptions: GraphAxisOptions = {
  axisOptionsX: axisOptionsH,
  axisOptionsY: axisOptionsL,
  axisOptionsZ: axisOptionsC,
};

export function RGBVisualization() {
  // hold state for RGB color inputs
  const [redComponent, setRedComponent] = useState<number>(1);
  const [greenComponent, setGreenComponent] = useState<number>(1);
  const [blueComponent, setBlueComponent] = useState<number>(1);

  // hold state for source & reference color space / illuminant options
  const [toColorSpace, setColorSpace] = useState<ColorSpace>(ColorSpace.sRGB);
  const [toReferenceSpace, setReferenceSpace] = useState<RenderSpace>(
    RenderSpace.LCHuv
  );
  const [referenceIlluminant, setReferenceIlluminant] = useState<Illuminant>(
    Illuminant.D65
  );

  // update the state to reflect the selection of which color profile to visualize
  const changeSourceSpace = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target;
      setColorSpace(Object(ColorSpace)[value]);
    },
    []
  );

  // update the reference illuminant to be used to calculate color transforms
  // to the reference space
  const changeReferenceIlluminant = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target;
      setReferenceIlluminant(Object(Illuminant)[value]);
    },
    []
  );

  const changeReferenceSpace = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target;
      setReferenceSpace(Object(RenderSpace)[value]);
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
      renderRGBPoint(
        [redComponent, greenComponent, blueComponent],
        Object(ColorSpace)[toColorSpace],
        RenderSpace[toReferenceSpace],
        Object(Illuminant)[referenceIlluminant],
        scene
      );
    },
    [
      redComponent,
      greenComponent,
      blueComponent,
      toColorSpace,
      toReferenceSpace,
      referenceIlluminant,
    ]
  );

  const renderLchhMesh = useCallback(
    (scene: Babylon.Scene) => {
      renderRGBinLUV(
        Object(ColorSpace)[toColorSpace],
        referenceIlluminant,
        scene
      );
    },
    [referenceIlluminant, toColorSpace]
  );

  // render the color space mesh given a selected color space
  const renderXyzMesh = useCallback(
    (scene: Babylon.Scene) => {
      renderColorSpace(
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
          onChange={changeSourceSpace}
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
        <Select
          className={styles.colorSpaceSelector}
          onChange={changeReferenceSpace}
          id="destination space"
          label="render space"
          initialValue={toReferenceSpace}
        >
          <RenderSpaceOptions />
        </Select>
      </header>

      <Graph3d
        type={
          toReferenceSpace === RenderSpace.LCHuv
            ? GraphType.cylindrical
            : GraphType.box
        }
        axisOptions={
          toReferenceSpace === RenderSpace.LCHuv
            ? cylindricalAxesOptions
            : undefined
        }
        className={styles.bottomSpacer}
        renderMethods={[
          renderHemiLight,
          toReferenceSpace === RenderSpace.LCHuv
            ? renderLchhMesh
            : renderXyzMesh,
          renderPointMesh,
        ]}
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
