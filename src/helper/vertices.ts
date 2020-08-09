import { VertexData } from "babylonjs";
import { ReferenceSpace, ColorSpace, Illuminant } from "./color-space";
import { Transform, normalizeLchColor } from "../helper/transformations";

interface GenerateVerticesOptions {
  bitDepth?: number;
  divisions?: number;
}

// generates a structured matrix of points representing the perimeter points
// around an RGB color space. This is useful to translate mesh volumes into
// alternative reference color spaces as applicable to Babylon.VertexData
export function generate_RGB_vertices({
  bitDepth = 8,
  divisions = 12,
}: GenerateVerticesOptions): number[][][] {
  // calculate the maximum component value boundary
  const maxC: number = Math.pow(2, bitDepth);

  // calculate an offset to use when iterating through loops of cross-sections
  const delta: number = maxC / divisions;

  // iterate through an array represeting number of paths in a mesh.
  // construct a list of perimeter points distributed evenly around the color space.
  // It is helpful here to think of the color space as a cube, and the paths to be
  // equidistant bands around the cube, similar to steel rings of a wooden barrel.
  return Array(divisions + 1)
    .fill(null)
    .map((path: number[][] | null, i: number) => {
      path = [];

      // derive a green component value, which represents 'height' of the cube.
      const g: number = i * delta - (i ? 1 : 0);

      // iterate perimeter 1 of 4
      for (
        let b: number = 0;
        b <= maxC - delta + 1;
        b + delta < maxC ? (b += delta) : (b += delta - 1)
      ) {
        path.push([0, g, b]);
      }

      // iterate perimeter 2 of 4
      for (
        let r: number = 0;
        r <= maxC - delta + 1;
        r + delta < maxC ? (r += delta) : (r += delta - 1)
      ) {
        path.push([r, g, maxC - 1]);
      }

      // iterate perimeter 3 of 4
      for (
        let b: number = maxC - 1;
        b >= 0 + delta - 1;
        b - delta > 0 ? (b -= delta) : (b -= delta - 1)
      ) {
        path.push([maxC - 1, g, b]);
      }

      // iterate perimeter 4 of 4
      for (
        let r: number = maxC - 1;
        r >= 0 + delta - 1;
        r - delta > 0 ? (r -= delta) : (r -= delta - 1)
      ) {
        path.push([r, g, 0]);
      }

      return path;
    });
}

export function mapVertexDataFromGeometry(
  referencePositions: number[][][],
  fromColorSpace: ReferenceSpace,
  toColorSpace: ReferenceSpace,
  transformationParams: any[],
  useProfile: ColorSpace = ColorSpace.sRGB
) {
  const positions: number[][][] = referencePositions.map((path: number[][]) =>
    mapPositionsFromPath(
      path,
      fromColorSpace,
      toColorSpace,
      transformationParams
    )
  );
  const facets: number[][][] = referencePositions.map(
    (path: number[][], pathIndex: number) =>
      pathIndex < referencePositions.length - 1
        ? mapFacetsFromPath(path, pathIndex)
        : []
  );
  const colors: number[][][] = referencePositions.map((path: number[][]) =>
    mapColorsFromPath(path, useProfile)
  );

  const useVertexData: VertexData = new VertexData();
  useVertexData.positions = positions.flat(2);
  useVertexData.indices = facets.flat(2);
  useVertexData.colors = colors.flat(2);

  return useVertexData;
}

export function mapColorsFromPath(
  path: number[][],
  useProfile: ColorSpace = ColorSpace.sRGB
): number[][] {
  return path.map((vertex: number[]) =>
    Transform(ReferenceSpace.RGB)
      .to(ReferenceSpace.XYZ)(vertex, useProfile)
      .concat([1])
  );
}

// given a set of parallel paths as expressed in a reference & uniform space,
// receive a path of points as an argument and return a map of facet triplets
// for each point in the path. The triplets assume an adjacent 'next' path. If
// no such path exists, the invoking context should take care not to invoke this
// function, less they will receive reference to indices that do not exist within
// the target mesh's geometry.
export function mapFacetsFromPath(path: number[][], p: number) {
  return path.map((point: number[], i: number) => {
    let p0: number = p * path.length + i;
    let p1: number | undefined = p0 + 1;
    let adj_p0: number | undefined = p0 + path.length - 1;
    let adj_p1: number | undefined = p0 + path.length;
    let facetA: number[] = p1 ? [p0, adj_p1, adj_p0] : [];
    let facetB: number[] = p1 ? [p0, p1, adj_p1] : [];
    return [facetA, facetB].flat();
  });
}

export function mapPositionsFromPath(
  path: number[][],
  fromColorSpace: ReferenceSpace,
  toColorSpace: ReferenceSpace,
  transformationParams: any[]
) {
  return path.map((vertex: number[]) =>
    Transform(fromColorSpace).to(toColorSpace)(vertex, ...transformationParams)
  );
}

// takes an LCHuv color that has been normalized to a 0-1 range and
// calculates x,y,z coordinates to be mapped as a point in polar space
function getPolarCoordinatesFor(colorNormalized: number[]): number[] {
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

export const getPositionsFor: any = {
  [ReferenceSpace.LCHuv]: {
    positions(
      geometry: number[][][],
      colorSpace: ColorSpace,
      referenceIlluminant: Illuminant
    ) {
      geometry
        .map((path: number[][]) =>
          mapPositionsFromPath(path, ReferenceSpace.RGB, ReferenceSpace.LCHuv, [
            colorSpace,
            referenceIlluminant,
          ])
            .map((lch_color: number[]) => normalizeLchColor(lch_color))
            .map(getPolarCoordinatesFor)
        )
        .flat(2);
    },
  },
};

export function getIndicesFor(geometry: number[][][]): number[] {
  return geometry
    .map((path: number[][], pathIndex: number) =>
      pathIndex < geometry.length - 1 ? mapFacetsFromPath(path, pathIndex) : []
    )
    .flat(2);
}

export function getColorsFor(
  geometry: number[][][],
  colorSpace: ColorSpace
): number[] {
  return geometry
    .map((path: number[][]) => mapColorsFromPath(path, colorSpace))
    .flat(2);
}


export function getVertexDataFor(geometry: number[][][], fromColorSpace:ReferenceSpace, toColorSpace:ReferenceSpace, transformationParams:[]): void{
  const vertexData: VertexData = new VertexData();
  const positions: number[][] = [];
  const indices: number[][] = [];
  const colors: number[][] = [];

  const methodMap: any = {
    [ReferenceSpace.RGB](vertex:number[]){
      Transform(fromColorSpace).to(toColorSpace)(
        vertex,
        ...transformationParams
      );
    }
  }

  for(let i:number = 0; i< geometry.length; i++){
    for(let j:number = 0; j< geometry[i].length; j++){

    }
  }
}