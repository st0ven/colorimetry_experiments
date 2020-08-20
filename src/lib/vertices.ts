import {
  ColorModel,
  ColorSpace,
  Illuminant,
  colorSpaceMap,
} from "./color-constants";
import {
  Transform,
  normalizeLchColor,
  expandRgbColor,
  deriveChromaticAdaptationMatrixFor,
  deriveRgbTransformationMatrixFor,
} from "./color-transformations";
import { VertexData, Axis } from "babylonjs";
import { flatten } from "./math-conversion";

// Generate a matrix of vertices representing a plane with a fixed component c.
// Provide the axis that should remain fixed. The additional 2 dimentional components
// will then map out a sized matrix determined by the divisions parameter.
export function generatePlaneVertices(
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

// use generatePlaneVertices to construct an array of 6 planar faces to compose
// a cube of evenly distributed vertices across each face. This cube geometry can
// then be subsequently transformed to represent color space geometry across various
// color spaces/models.
export function generateColorSpaceGeometry(
  divisions: number = 1
): number[][][] {
  const planeVertices: number[][][] = [];

  for (let i: number = 0; i <= 2; i++) {
    for (let j: number = 0; j <= 1; j++) {
      const axis: Axis = !i ? Axis.X : i === 1 ? Axis.Y : Axis.Z;
      planeVertices.push(generatePlaneVertices(j, axis, divisions));
    }
  }

  return planeVertices;
}

// given a position in XYZ space, calculate the appropriate RGB value to
// assign to that vertex.
function getColorFromVertex(
  vertex: number[],
  useProfile: ColorSpace = ColorSpace.sRGB,
  referenceIlluminant: Illuminant = Illuminant.D65
): number[] {
  return Transform(ColorModel.RGB)
    .to(ColorModel.XYZ)(vertex, useProfile, referenceIlluminant)
    .concat([1]);
}

// given a set of parallel paths as expressed in a reference & uniform space,
// receive a path of points as an argument and return a map of facet triplets
// for each point in the path. The triplets assume an adjacent 'next' path. If
// no such path exists, the invoking context should take care not to invoke this
// function, less they will receive reference to indices that do not exist within
// the target mesh's geometry.
function getFacetsFromVertex(i: number, offset: number): number[] {
  let p0: number = i;
  let p1: number = p0 + 1;
  let adj_p0: number = p0 + offset;
  let adj_p1: number = p0 + offset + 1;
  let facetA: number[] = [p0, adj_p1, adj_p0];
  let facetB: number[] = [p0, p1, adj_p1];
  return flatten([facetA, facetB]);
}

// given a position in XYZ space, map where to render that position based on
// the desired reference color model. This can either be calculated as polar or
// euclidean coordinates based on the desired color model to visualize the color space.
function getPositionFromVertex(
  vertex: number[],
  sourceColorSpace: ColorSpace,
  sourceColorModel: ColorModel,
  targetColorModel: ColorModel,
  referenceIlluminant: Illuminant
): number[] {
  const sourceIlluminant: Illuminant | undefined = colorSpaceMap.get(
    sourceColorSpace
  )?.illuminant;

  const commonTransformationArgs: any[] = [
    vertex,
    sourceColorSpace,
    referenceIlluminant,
  ];

  const transformationArgs: any =
    targetColorModel === ColorModel.RGB && sourceIlluminant
      ? [
          ...commonTransformationArgs,
          {
            compand: false,
            useAdaptiveMatrix: deriveChromaticAdaptationMatrixFor(
              sourceIlluminant,
              Illuminant.D50
            ),
            useTransformationMatrix: deriveRgbTransformationMatrixFor(
              sourceColorSpace,
              referenceIlluminant
            ),
          },
        ]
      : commonTransformationArgs;

  const transformedColor: number[] = Transform(sourceColorModel).to(
    targetColorModel
  )(...transformationArgs);

  const mappedVertex: number[] =
    targetColorModel === ColorModel.LCHuv
      ? getPolarCoordinatesFor(normalizeLchColor(transformedColor))
      : transformedColor;

  return mappedVertex;
}

// given a geometry matrix of positions, return calculated VertexData to render the
// geometry within Babylon.js. Ultimately maps positions, facets and colors for each vertex.
export function getTransformedVertexDataFromGeometry(
  geometry: number[][][],
  fromColorSpace: ColorSpace,
  fromColorModel: ColorModel,
  toColorModel: ColorModel,
  referenceIlluminant: Illuminant
): VertexData {
  const positions: number[][] = [];
  const facets: number[][] = [];
  const colors: number[][] = [];

  for (let i: number = 0; i < geometry.length; i++) {
    for (let j: number = 0; j < geometry[i].length; j++) {
      const vertex: number[] = geometry[i][j];
      const pathLength: number = Math.sqrt(geometry[i].length);

      positions.push(
        getPositionFromVertex(
          expandRgbColor(vertex),
          fromColorSpace,
          fromColorModel,
          toColorModel,
          referenceIlluminant
        )
      );

      colors.push(
        getColorFromVertex(
          expandRgbColor(vertex),
          fromColorSpace,
          referenceIlluminant
        )
      );

      // calculate indices algorithmically and push to list
      if (geometry[i][j + pathLength] && j % pathLength < pathLength - 1) {
        facets.push(
          getFacetsFromVertex(i * geometry[i].length + j, pathLength)
        );
      }
    }
  }

  const vertexData: VertexData = new VertexData();
  vertexData.positions = flatten(positions);
  vertexData.indices = flatten(facets);
  vertexData.colors = flatten(colors);

  return vertexData;
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

// given a source collection of vertices representing a 3d cube,
// receive a number representing how many divisions to extract from
// the source collection. Returns a new, trimmed copy of the source.
export function trimGeometry(
  vertices: number[][][],
  divisions: number
): number[][][] {
  // an alias representing the length of vertices within a single face of the geometry
  const sourceLength: number = vertices[0].length;

  // if the number of vertices is less than the division count, return the original data
  if (sourceLength < divisions - 1) {
    console.warn(
      `Attempted to trim vertices with division count of ${divisions}, but the source only had ${sourceLength} number of entries`
    );
    return vertices;
  }

  // otherwise proceed to trim data
  else {
    return trimGeometryByDivisionsAlgo(vertices, divisions);
  }
}

// algorithm which trims out the vectors from an array of  planar matrices of vectors
// at set intervals as defined by how many divisions the resulting mesh should contain.
function trimGeometryByDivisionsAlgo(
  // the original set of vertices to trim
  geometry: number[][][],
  // the resulting number of dimensions a planar matrix should contain
  divisions: number
): number[][][] {
  // instantiate a variable to contain our final delivered trimmed set of vertices
  const trimmedGeometry: number[][][] = [];

  // loop through each planar surface/matrix from the vertex data
  for (let i: number = 0; i < geometry.length; i++) {
    // reference the existing vertex data plane
    const plane: number[][] = geometry[i];

    // create a new plane array which holds the selected/trimmed vertexes
    let trimmedPlane: number[][] = [];

    // find the number of current divisions in the plane
    const planeDivisions: number = Math.sqrt(plane.length) - 1;

    // determine how many points within a planar vector matrix to extract
    const iterations: number = Math.pow(divisions + 1, 2);

    // loop through the planar matrix based on the number of extracted
    // vertices that are necessary to complete the trim operation.
    for (let j: number = 0; j < iterations; j++) {
      // determine row/col 'indices' relative to the iteration count.
      // Will be used to calculate a final matrix offset to extract a vector.
      // ultimately represents the vertex position within the planar matrix
      // as represented by indices
      const rowIndex: number = j % (divisions + 1);
      const colIndex: number = Math.floor(j / (divisions + 1));

      // map derived index markers into a scalar offset relevant to the
      // size of the source vertex data.
      const rowDelta: number = (planeDivisions / divisions) * rowIndex;
      const colDelta: number = Math.floor(
        (plane.length / divisions) * colIndex
      );

      // subtracts from the colDelta to ensure the added rowDelta will
      // 'center' around the vertex of interest
      const trimDelta: number = !colIndex
        ? 0
        : colIndex === divisions
        ? planeDivisions + 1
        : (planeDivisions / divisions) * colIndex;

      // calculate the final vertex index to trim relative to the original vertex data
      const vertexIndex: number = Math.ceil(colDelta - trimDelta + rowDelta);

      // set a reference to the vector within the source planar matrix
      const vertex: number[] = plane[vertexIndex].map((component: number) =>
        parseFloat(component.toFixed(4))
      );

      // append this to our trimmed plane
      trimmedPlane.push(vertex);
    }
    // add trimmed plane to trimmed geometry
    trimmedGeometry.push(trimmedPlane);
  }
  return trimmedGeometry;
}
