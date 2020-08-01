import * as Babylon from "babylonjs";
import { ColorSpace, XYZ_primaries } from "../helper/color-space";
import { findMeshByName, findEntityInList } from "../helper/babylon-entities";
import { RenderLabelOptions, renderLabel } from "../rendering/billboards";
import {
  get_xyY_projection,
  normalizeColor,
  transformRGBtoXYZ,
  XYZ_to_xyY,
} from "../helper/color-space-conversion";

/*
Render color profile planes projected into xyY space
*/
export function renderChromaticityPlane(
  colorSpace: ColorSpace,
  scene: Babylon.Scene,
  entities?: Array<Babylon.Mesh | Babylon.StandardMaterial>
): Array<Babylon.Mesh | Babylon.StandardMaterial> {
  // define names of scene entities
  const meshName: string = "chromaticity-plane";
  const materialName: string = `${meshName}-material`;

  // used to define facet triangles to manually render primary points as a polygon
  const facetIndices: number[] = [4, 2, 0];

  // get vector positions array in xyY space for all primaries, given a
  // particular color profile array of xyY primaries and xyY whitepoint
  const positions: Array<number> = XYZ_primaries.map((primary: number[]) =>
    transformRGBtoXYZ(primary, colorSpace, { compand: false })
  )
    .map(XYZ_to_xyY)
    .map(get_xyY_projection)
    .map((primary: number[]) => primary.map((c: number) => c - 0.01))
    .flat();

  // gathers an array of numbers representing a 4 number pair representing
  // r, g, b & a values of a Babylon.Color4 object.
  const colors: number[] = XYZ_primaries.map((primary: number[]) =>
    transformRGBtoXYZ(primary, colorSpace, {
      compand: true,
    }).concat([1])
  ).flat();

  // instantiate vertexData which will map to a mesh to manually build Babylon polygon
  const vertexData: Babylon.VertexData = new Babylon.VertexData();
  vertexData.positions = positions;
  vertexData.colors = colors;
  vertexData.indices = facetIndices;

  // instantiate material for rendering effect
  const material: Babylon.StandardMaterial =
    findEntityInList(entities, materialName) ||
    new Babylon.StandardMaterial(materialName, scene);

  // show backside of mesh
  material.backFaceCulling = false;

  // createa a new mesh as none with this name have been found
  const mesh: Babylon.Mesh =
    findEntityInList(entities, meshName) || new Babylon.Mesh(meshName, scene);

  // apply the material to mesh
  mesh.material = material;

  // apply vertextData to mesh to render polygon
  vertexData.applyToMesh(mesh, true);

  // return scene entities to be captured for later reference
  return [mesh, material];
}

/*
Render spectral locus of tristimulus values in XYZ space
*/
export function renderSpectralLocusXYZ(
  spectralData: [[string, string, string, string]],
  scene: Babylon.Scene
) {
  // establish name for the mesh to be created within the scene
  const meshName: string = "spectral_locus";

  // The spectral locus is a static element and only needs to be rendered once.
  // Only proceed to render if an instance cannot be found in the scene.
  if (!findMeshByName(meshName, scene)) {
    const spectralMin: number = 390;
    const spectralMax: number = 700;
    const wavelengthDelta: number = 0.1;

    // mutate the rawSpectral data to extract an array of Babylon.Vector3
    // objects representing the coordinates at each wavelength in the LUT.
    const spectralPoints_xyY: Babylon.Vector3[] = spectralData
      // clip data to spectral range
      .slice(0, (spectralMax - spectralMin) * (1 / wavelengthDelta) + 1)
      // extract wavelength info and coerce into numeric form
      .map(
        (datum: Array<string>) =>
          // normalize to a 3d plane as a vector3 array
          new Babylon.Vector3(
            ...normalizeColor(
              // extract wavelength info and coerce into numeric form
              datum.slice(1).map((point: string) => Number(point))
            )
          )
      );

    // create a Babylon.Path3D object out of the extracted vector arary
    const XYZ_locus_curve: Babylon.Path3D = new Babylon.Path3D(
      spectralPoints_xyY
    );

    // constants to be used while painting the locus details
    const normals: Array<Babylon.Vector3> = XYZ_locus_curve.getNormals();
    const binormals: Array<Babylon.Vector3> = XYZ_locus_curve.getBinormals();
    const markerScale: number = 0.02;
    const labelSize: number = 0.08;

    // configure label rendering options
    const labelOptions: RenderLabelOptions = getLabelOptions(labelSize);

    // iterate through each curve point to render wavelength markers
    // along the path. Markers are placed with prejudice for legibility.
    XYZ_locus_curve.getCurve().forEach(function renderSpectralLocusMarker(
      vector: Babylon.Vector3,
      index: number
    ) {
      // capture the current wavelength value
      const lambda: number =
        (spectralMin * (1 / wavelengthDelta) + index) / (1 / wavelengthDelta);

      // determine the threshold coefficient to determine bias against frequency
      // of labeling where lambda approaches min or max of spectrum
      const markerThreshold: number = lambda >= 460 && lambda <= 610 ? 1 : 10;

      // label at weighted bias wavelengths
      if (!(lambda % ((1 / wavelengthDelta) * markerThreshold))) {
        // calculate the marker endpoint vector
        const markerVector: Babylon.Vector3 = vector
          .add(normals[index].scale(markerScale))
          .add(binormals[index].scale(markerScale));

        // render marker line
        Babylon.MeshBuilder.CreateLines(
          `XYZ-locus-mark-${index}`,
          { points: [vector, markerVector] },
          scene
        );

        // render the marker label relative to the marker with rendering options.
        renderLabel(`${lambda}nm`, markerVector, labelOptions, scene);
      }
    });

    // Build the main locus curve mesh into the scene
    Babylon.MeshBuilder.CreateLines(
      meshName,
      {
        points: XYZ_locus_curve.getCurve(),
      },
      scene
    );
  }
}

function getLabelOptions(labelSize: number): RenderLabelOptions {
  return {
    fontSize: 160,
    fontWeight: "normal",
    fontFamily: "Arial",
    labelWidth: labelSize * 2,
    labelHeight: labelSize,
    positionScale: 1.04,
    scale: 0.75,
    textureWidth: 640,
    textureHeight: 320,
  };
}
