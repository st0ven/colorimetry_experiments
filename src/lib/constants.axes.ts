import { colorModelMap } from "@lib/constants.color";
import { AxisType, ColorModel } from "@lib/enums";
import { Vector3 } from "babylonjs";
import { AxisRenderOptions } from "@rendering/axes";

// set a constant scalar for polar coordinate rendering
const axisOptionsPolarScale: number = 0.75;

// options which indicate how to render axis normals for various Color Models
const axisOptions: Map<string, AxisRenderOptions> = new Map();

// A common pool of axis options to use for many other axis normals
axisOptions.set("common", {
  axisOrigin: new Vector3(0, 0, 0),
  floatPoint: 2,
  markerSize: 0.03,
  max: 1,
  min: 0,
  opacity: 0.5,
  scalarMin: 0,
  scalarMax: 1,
});

// A common cubic axis option set typically applicable for XYZ space
axisOptions.set("cubic", {
  ...axisOptions.get("common"),
  markers: 4,
  markerVector: new Vector3(0, 0, 1),
});

// Luminosity axis for LAB, LUV type color spaces
axisOptions.set("Lpolar", {
  ...axisOptions.get("common"),
  scalarMin: colorModelMap.get(ColorModel.LCHuv)?.range[0][0],
  scalarMax: colorModelMap.get(ColorModel.LCHuv)?.range[0][1],
  markers: 4,
  floatPoint: 0,
  axisLabel: "L",
  axisOrigin: new Vector3(1 * axisOptionsPolarScale, 0, 0),
});

// Extension of default cubic axis with a custom label and maximum
axisOptions.set("Lcubic", {
  ...axisOptions.get("cubic"),
	axisLabel: "L",
	scalarMax: 100,
});

// Chroma axis options
// defines the amount of colorfulness of a specific color
axisOptions.set("C", {
  ...axisOptions.get("common"),
  axisLabel: "C",
  axisOrigin: new Vector3(0, 0, 0),
  floatPoint: 0,
  markers: 4,
  markerVector: new Vector3(0, 1 * axisOptionsPolarScale, 0),
  max: axisOptionsPolarScale,
});

axisOptions.set("Cab", {
  ...axisOptions.get("C"),
  scalarMax: colorModelMap.get(ColorModel.LCHab)?.range[1][1],
  scalarMin: colorModelMap.get(ColorModel.LCHab)?.range[1][0],
});

axisOptions.set("Cuv", {
  ...axisOptions.get("C"),
  scalarMax: colorModelMap.get(ColorModel.LCHuv)?.range[1][1],
  scalarMin: colorModelMap.get(ColorModel.LCHuv)?.range[1][0],
});

// Polar/cylindrical Hue axis options
// describes an angle which aligns to a particular hue as represented in polar space
axisOptions.set("H", {
  ...axisOptions.get("common"),
  axisLabel: "h",
  markers: 18,
  radius: axisOptionsPolarScale,
  type: AxisType.polar,
});

// A component of LAB axis options
// a range which influences yellow <-> blue spectrum
axisOptions.set("A", {
  ...axisOptions.get("cubic"),
  axisLabel: "A",
  floatPoint: 0,
  markers: 8,
  scalarMax: colorModelMap.get(ColorModel.LAB)?.range[1][1],
  scalarMin: colorModelMap.get(ColorModel.LAB)?.range[1][0],
});

// B component of LAB axis options
// a range which influences red <-> green spectrum
axisOptions.set("B", {
  ...axisOptions.get("cubic"),
  axisLabel: "B",
  floatPoint: 0,
  markers: 8,
  scalarMax: colorModelMap.get(ColorModel.LAB)?.range[2][1],
  scalarMin: colorModelMap.get(ColorModel.LAB)?.range[2][0],
});

// A component of LAB axis options
axisOptions.set("U", {
  ...axisOptions.get("cubic"),
  axisLabel: "U",
  floatPoint: 0,
  markers: 8,
  scalarMax: colorModelMap.get(ColorModel.LUV)?.range[1][1],
  scalarMin: colorModelMap.get(ColorModel.LUV)?.range[1][0],
});

// B component of LAB axis options
axisOptions.set("V", {
  ...axisOptions.get("cubic"),
  axisLabel: "V",
  floatPoint: 0,
  markers: 8,
  scalarMax: colorModelMap.get(ColorModel.LCHuv)?.range[2][1],
  scalarMin: colorModelMap.get(ColorModel.LCHuv)?.range[2][0],
});

// XYZ axes which extend 'cubic' base axis options
axisOptions.set("X", { ...axisOptions.get("cubic"), axisLabel: "X" });
axisOptions.set("Y", { ...axisOptions.get("cubic"), axisLabel: "Y" });
axisOptions.set("Z", {
  ...axisOptions.get("cubic"),
  axisLabel: "Z",
  markerVector: new Vector3(1, 0, 0),
});

// export mmap to conveniently group these axis options as a list
// which are mapped to their applicable color models
export const axisOptionsMap: Map<
  ColorModel,
  (AxisRenderOptions | undefined)[]
> = new Map([
	[
		ColorModel.LCHab,
		[axisOptions.get("Cab"), axisOptions.get("Lpolar"), axisOptions.get("H")],
	],
  [
    ColorModel.LCHuv,
    [axisOptions.get("Cuv"), axisOptions.get("Lpolar"), axisOptions.get("H")],
  ],
  [
    ColorModel.LAB,
    [axisOptions.get("A"), axisOptions.get("Lcubic"), axisOptions.get("B")],
  ],
  [
    ColorModel.LUV,
    [axisOptions.get("U"), axisOptions.get("Lcubic"), axisOptions.get("V")],
  ],
  [
    ColorModel.XYZ,
    [axisOptions.get("X"), axisOptions.get("Y"), axisOptions.get("Z")],
  ],
]);
