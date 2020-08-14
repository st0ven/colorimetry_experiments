import { ReferenceSpace, ColorSpace, Illuminant } from "./color-space";
import { Transform } from "../helper/transformations";
import { Axis } from "../rendering/axes";

// Generate a matrix of vertices representing a plane with a fixed component c.
// Provide the axis that should remain fixed. The additional 2 dimentional components
// will then map out a sized matrix determined by the divisions parameter.
export function generate_plane_vertices(
  c: number,
  axis: Axis,
  divisions = 12
): number[][] {
  // calculate the maximum component value boundary
  // const maxC: number = Math.pow(2, bitDepth);
  const maxC: number = 1;

  // calculate an offset to use when iterating through loops of cross-sections
  const delta: number = maxC / divisions;

  // store vertices of a plane
  const plane: number[][] = [];

  // iterate through first component range
  for (let i: number = 0; i <= divisions; i++) {
    // calculate the component value on this iteration
    let a: number = i * delta;

    // iterate through second coponent range
    for (let j: number = 0; j <= divisions; j++) {
      // calculate the other component value for this iteration
      let b: number = j * delta;

      // append the vertex value to the plane vertex list.
      // order of components is dependent on the fixed axis.
      plane.push(
        axis === Axis.X ? [c, a, b] : axis === Axis.Y ? [a, c, b] : [a, b, c]
      );
    }
  }

  return plane;
}


export function getBoxGeometry(divisions: number = 1): number[][][] {
  const planeVertices: number[][][] = [];

  for (let i: number = 0; i <= 2; i++) {
    for (let j: number = 0; j <= 1; j++) {
      const axis: Axis = !i ? Axis.X : i === 1 ? Axis.Y : Axis.Z;
      planeVertices.push(generate_plane_vertices(j, axis, divisions));
    }
  }

  return planeVertices;
}

export function mapColorFromVertex(
  vertex: number[],
  useProfile: ColorSpace = ColorSpace.sRGB,
  referenceIlluminant: Illuminant = Illuminant.D65
): number[] {
  return Transform(ReferenceSpace.RGB)
    .to(ReferenceSpace.XYZ)(vertex, useProfile, { referenceIlluminant })
    .concat([1]);
}

// given a set of parallel paths as expressed in a reference & uniform space,
// receive a path of points as an argument and return a map of facet triplets
// for each point in the path. The triplets assume an adjacent 'next' path. If
// no such path exists, the invoking context should take care not to invoke this
// function, less they will receive reference to indices that do not exist within
// the target mesh's geometry.
export function mapFacetsFromVertex(i: number, offset: number): number[] {
  let p0: number = i;
  let p1: number = p0 + 1;
  let adj_p0: number = p0 + offset;
  let adj_p1: number = p0 + offset + 1;
  let facetA: number[] = [p0, adj_p1, adj_p0];
  let facetB: number[] = [p0, p1, adj_p1];
  return [facetA, facetB].flat();
}

export function mapPositionFromVertex(
  vertex: number[],
  fromColorSpace: ReferenceSpace,
  toColorSpace: ReferenceSpace,
  transformationParams: any[]
): number[] {
  return Transform(fromColorSpace).to(toColorSpace)(
    vertex,
    ...transformationParams
  );
}

// takes an LCHuv color that has been normalized to a 0-1 range and
// calculates x,y,z coordinates to be mapped as a point in polar space
export function getPolarCoordinatesFor(colorNormalized: number[]): number[] {
  //const colorNormalized: number[] = normalizeLchColor(color);
  const hue: number = colorNormalized[2] * 2 * Math.PI;
  const chroma: number = colorNormalized[1];
  const lightness: number = colorNormalized[0];

  // calculate cartesian coordinates of polar space
  const x: number = chroma * Math.cos(hue);
  const y: number = lightness;
  const z: number = chroma * Math.sin(hue);

  // return the new constructed point
  return [x, y, z];
}
