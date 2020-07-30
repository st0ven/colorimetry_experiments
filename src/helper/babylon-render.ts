import * as Babylon from "babylonjs";
import { transformRGBtoXYZ } from "./color-space-conversion";
import {
  ColorSpace,
  colorSpace,
  XYZ_primaries,
  illuminant,
  Illuminant,
} from "./color-space";

// itereate through scene meshes and return the mesh instance that matches
// the provided name, or undefined if none are found
export function findMeshByName(
  name: string,
  scene: Babylon.Scene
): Babylon.AbstractMesh | undefined {
  for (let mesh of scene.meshes) {
    if (mesh.name === name) {
      return mesh;
    }
  }
  return undefined;
}
export function findMaterialByName(
  name: string,
  scene: Babylon.Scene
): Babylon.Material | undefined {
  for (let material of scene.materials) {
    if (material.name === name) {
      return material;
    }
  }
  return undefined;
}
function findEntityInList(list: any[], queryName: string): any | undefined {
  for (let item of list) {
    if (item.name === queryName) {
      return item;
    }
  }
  return undefined;
}

// takes a coordinate in RGB refernce space and projects onto a
// 3d plane for easier visualization of the chromaticity plot
function normalize_XYZ([X, Y, Z]: number[]): number[] {
  const sum: number = X + Y + Z;
  return [X / sum, Y / sum, Z / sum];
}

/*
Render color profile planes projected into xyY space
*/
export function renderProfileChromaticityPlane(
  name: string,
  colorSpaceName: ColorSpace,
  scene: Babylon.Scene
) {
  if (scene) {
    const { primaries } = colorSpace[colorSpaceName];

    // used to define facet triangles to manually render primary points as a polygon
    const facetIndices: number[] = [2, 1, 0]; //[0, 5, 2];

    // get vector positions array in xyY space for all primaries, given a
    // particular color profile array of xyY primaries and xyY whitepoint
    const positions: Array<number> = primaries
      .map(([x, y]: number[]) => [x, y, 1 - x - y])
      .map((primary: number[]) => primary.map((c: number) => c - 0.01))
      .flat();

    // gathers an array of numbers representing a 4 number pair representing
    // r, g, b & a values of a Babylon.Color4 object.
    const colors: number[] = [
      XYZ_primaries[0],
      XYZ_primaries[2],
      XYZ_primaries[4],
    ]
      .map((primary: number[]) =>
        transformRGBtoXYZ(primary, colorSpaceName, {
          compand: true,
        }).concat([1])
      )
      .flat();

    // create reference to a mesh instance. We want to update exisitng meshes
    // if they exist rather than destroying/recreating them.
    let existingMesh: Babylon.AbstractMesh | undefined = findMeshByName(
      name,
      scene
    );

    // if an existing mesh has been found, update its vertexData
    // which includes both positions and color range
    if (existingMesh) {
      existingMesh.setVerticesData(
        Babylon.VertexBuffer.PositionKind,
        positions,
        true
      );
      existingMesh.setVerticesData(
        Babylon.VertexBuffer.ColorKind,
        colors,
        true
      );
    } else {
      // instantiate vertexData which will map to a mesh to manually build Babylon polygon
      const vertexData: Babylon.VertexData = new Babylon.VertexData();
      vertexData.positions = positions;
      vertexData.colors = colors;
      vertexData.indices = facetIndices;

      // instantiate material for rendering effect
      const mat: Babylon.StandardMaterial = new Babylon.StandardMaterial(
        `${name}-material`,
        scene
      );
      mat.backFaceCulling = false;

      // createa a new mesh as none with this name have been found
      const newMesh = new Babylon.Mesh(name, scene);
      newMesh.material = mat;

      // apply vertextData to mesh to render polygon
      vertexData.applyToMesh(newMesh, true);
    }
  }
}

/*
Render spectral locus of tristimulus values in XYZ space
*/
export function renderSpectralLocusXYZ(
  name: string = "spectral_locus",
  rawSpectralData: string[][],
  scene: Babylon.Scene
) {
  // The spectral locus is a static element and only needs to be rendered once.
  // Only proceed to render if an instance cannot be found in the scene.
  if (!findMeshByName(name, scene)) {
    const spectralMin: number = 390;
    const spectralMax: number = 700;
    const wavelengthDelta: number = 0.1;

    // mutate the rawSpectral data to extract an array of Babylon.Vector3
    // objects representing the coordinates at each wavelength in the LUT.
    const spectralPoints_xyY: Babylon.Vector3[] = rawSpectralData
      // clip data to spectral range
      .slice(0, (spectralMax - spectralMin) * (1 / wavelengthDelta) + 1)
      // extract wavelength info and coerce into numeric form
      .map(
        (datum: Array<string>) =>
          // normalize to a 3d plane as a vector3 array
          new Babylon.Vector3(
            ...normalize_XYZ(
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
    const labelOptions: RenderLabelOptions = {
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
      name,
      {
        points: XYZ_locus_curve.getCurve(),
      },
      scene
    );
  }
}

/*
Render profile color space in XYZ space
*/
export function renderColorSpace(
  name: string,
  colorSpaceName: ColorSpace,
  referenceIlluminant: Illuminant,
  scene: Babylon.Scene
) {
  // include black & white points with the 6 primaries
  const XYZ_positions: number[][] = [[0, 0, 0], ...XYZ_primaries, [1, 1, 1]];

  // positions are calculated by mapping primary points + whitepoint & blackpoint
  // as they are companded from their source color space into reference space
  const positions: number[] = XYZ_positions.map((color: number[]) =>
    transformRGBtoXYZ(color, colorSpaceName, {
      referenceIlluminant: illuminant[referenceIlluminant],
    })
  ).flat();

  // colors must also compand values from source space to reference space but also
  // should apply gamma correction relevant to the profile for accurate color representation
  const colors: number[] = XYZ_positions.map((color: number[]) =>
    transformRGBtoXYZ(color, colorSpaceName, {
      compand: true,
      referenceIlluminant: illuminant[referenceIlluminant],
    }).concat([1])
  ).flat();

  // define babylon VertexData to be applied to the 3d box mesh
  const vertexData: Babylon.VertexData = new Babylon.VertexData();
  vertexData.positions = positions;
  vertexData.colors = colors;

  // search for the existing mesh name if any controls have been updated
  let existingMesh: Babylon.AbstractMesh | undefined = findMeshByName(
    name,
    scene
  );

  // update the mesh if this is a re-render by applying the new positions/color data
  if (existingMesh) {
    existingMesh.setVerticesData(
      Babylon.VertexBuffer.PositionKind,
      positions,
      true
    );
    existingMesh.setVerticesData(Babylon.VertexBuffer.ColorKind, colors, true);
  }
  // otherwise we are creating a fresh/new mesh
  else {
    // which will require facets to be defined through indices property in VertexData
    vertexData.indices = [
      [3, 0, 1],
      [3, 1, 2],
      [4, 3, 2],
      [7, 4, 2],
      [7, 2, 1],
      [6, 7, 1],
      [7, 5, 4],
      [6, 5, 7],
      [4, 5, 0],
      [0, 3, 4],
      [6, 1, 0],
      [0, 5, 6],
    ].flat();

    // creation of material for wireframe effect
    const mat: Babylon.StandardMaterial = new Babylon.StandardMaterial(
      "emissive",
      scene
    );
    mat.emissiveColor = new Babylon.Color3(1, 1, 1);
    mat.useEmissiveAsIllumination = true;
    mat.alpha = 0.05;
    mat.wireframe = true;

    const invisMat: Babylon.StandardMaterial = new Babylon.StandardMaterial(
      "alpha-mat",
      scene
    );
    invisMat.alpha = 0.1;

    // base mesh with vertex data applied
    const mesh: Babylon.Mesh = new Babylon.Mesh(name, scene);
    mesh.overlayAlpha = 0;
    mesh.material = invisMat;
    vertexData.applyToMesh(mesh);

    // clone the base mesh and apply material for the additional wireframe effect
    const wireframe: Babylon.Mesh = mesh.clone(`${name}_wireframe`);
    wireframe.material = mat;

    /*const mappedColors = [
      XYZ_primaries[0],
      XYZ_primaries[2],
      XYZ_primaries[4],
    ].map(([X, Y, Z]: number[]) =>
      arr.map(
        (a) =>
          new Babylon.Vector3(
            ...convert_XYZ_to_Luv_space(
              convert_RGB_XYZ_Space(
                [X * (a / 255), Y * (a / 255), Z * (a / 255)],
                colorSpaceName
              ),
              illuminant[Illuminant.C]
            )
          )
      )
    );
    mappedColors.map((components: Babylon.Vector3[], f) => {
      Babylon.MeshBuilder.CreateLines(
        `spectralz-${f}`,
        { points: components },
        scene
      );
    });
    console.log(mappedColors);*/

    /*const points: number[][] = [];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < (i < 2 ? 256 : 256); j++) {
        points.push([
          (i ? 255 : j) / 255,
          (i === 1 ? j : i > 1 ? 255 : 0) / 255,
          (i === 2 ? j : 0) / 255,
        ]);
      }
    }
    const allPoints: number[][][] = [
      points,
      points.map(([X, Y, Z]: number[]) => [Y, Z, X]),
      points.map(([X, Y, Z]: number[]) => [Z, X, Y]),
    ]//.map((primaryPoints: number[][]) => rotateMatrix(primaryPoints));
    const lines: Babylon.Vector3[][] = allPoints.map(
      (primaryPoints: number[][]) =>
        primaryPoints.map(
          (points: number[]) =>
            new Babylon.Vector3(
              ...compand_RGB_XYZ_Space(points, colorSpaceName)
            )
        )
    );
    Babylon.MeshBuilder.CreateLineSystem(
      "points-test",
      { lines: lines },
      scene
    );
    console.log(points);
    */
  }
}

export function renderRGBPoint(
  rgb_color: number[],
  currentSpace: ColorSpace,
  referenceIlluminant: Illuminant,
  scene: Babylon.Scene,
  entityRefs?: Array<
    Babylon.StandardMaterial | Babylon.AbstractMesh | Babylon.TransformNode
  >
): Array<
  Babylon.StandardMaterial | Babylon.AbstractMesh | Babylon.TransformNode
> {
  // hold a reference ot entity names to ne used in this render function
  const entityNames: any = {
    transform: "rgb-point-transform",
    material: "rgb-point-material",
    mesh: "rgb-point-mesh",
  };

  console.log(referenceIlluminant);

  // derive location in XYZ space of point center
  const pointPosition: number[] = transformRGBtoXYZ(rgb_color, currentSpace, {
    referenceIlluminant: illuminant[referenceIlluminant],
  });

  // derive normalized RGB color for the point within the current space
  const pointColor: number[] = transformRGBtoXYZ(rgb_color, currentSpace, {
    compand: true,
    referenceIlluminant: illuminant[referenceIlluminant],
  });

  // Create a transform node, or reference one from a provided entity list.
  // set the transform position based on derived pointPosition.
  // This ultimately moves the sphere to the proper location within XYZ space
  // create new transform node
  const transformNode: Babylon.TransformNode =
    (entityRefs
      ? findEntityInList(entityRefs, entityNames.transform)
      : undefined) || new Babylon.TransformNode(entityNames.transform);

  // move the transformation node to align with the updated position
  transformNode.position.x = pointPosition[0];
  transformNode.position.y = pointPosition[1];
  transformNode.position.z = pointPosition[2];

  // find the material within the scene if it hasnt yet been created
  const material: Babylon.StandardMaterial =
    (entityRefs
      ? findEntityInList(entityRefs, entityNames.material)
      : undefined) || new Babylon.StandardMaterial(entityNames.material, scene);

  // apply the converted color as the material diffuse color
  material.diffuseColor = new Babylon.Color3(...pointColor);

  // search for the existing mesh name if any controls have been updated
  // or create a new one if none are found
  let mesh: Babylon.AbstractMesh | Babylon.Mesh =
    (entityRefs ? findEntityInList(entityRefs, entityNames.mesh) : undefined) || //findMeshByName(entityNames.mesh, scene) ||
    Babylon.SphereBuilder.CreateSphere(
      entityNames.mesh,
      { diameter: 0.04 },
      scene
    );

  // set mesh properties
  mesh.parent = transformNode;
  mesh.material = material;
  mesh.useVertexColors = true;

  // return entities for reference in successive calls
  return [material, mesh, transformNode];
}

/*
render billboard text labels
*/
interface RenderLabelOptions {
  backgroundColor?: string;
  color?: string;
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  labelWidth?: number;
  labelHeight?: number;
  opacity?: number;
  positionScale?: number;
  scale?: number;
  textureWidth?: number;
  textureHeight?: number;
}

// given a label text, Vector3 position, and set of options
// render a label as a billboard in 3d space
export function renderLabel(
  label: string,
  position: Babylon.Vector3,
  {
    backgroundColor = "rgba(0,0,0,0)",
    color = "white",
    fontSize = 128,
    fontWeight = "normal",
    fontFamily = "Arial",
    labelWidth = 0.25,
    labelHeight = 0.125,
    opacity = 1,
    positionScale = 1,
    scale = 1,
    textureWidth = 240,
    textureHeight = 240,
  }: RenderLabelOptions,
  scene: Babylon.Scene
) {
  // construct label mesh
  const mesh = Babylon.MeshBuilder.CreatePlane(
    `label-plane-${label}`,
    {
      width: labelWidth,
      height: labelHeight,
      sideOrientation: Babylon.Mesh.DOUBLESIDE,
    },
    scene
  );

  // construct texture instance for label
  const texture = new Babylon.DynamicTexture(
    `label-texture-${label}`,
    { width: textureWidth, height: textureHeight },
    scene,
    false
  );

  // construct material instance for label
  const material = new Babylon.StandardMaterial(`label-mat-${label}`, scene);

  // assign texture to material
  material.diffuseTexture = texture;

  // transformations to mesh to anchor to marker endpoint
  mesh.position = position.scale(positionScale);
  mesh.scaling = new Babylon.Vector3(scale, scale, scale);
  mesh.billboardMode = Babylon.Mesh.BILLBOARDMODE_ALL;
  mesh.material = material;

  // set texture properties and render text
  texture.hasAlpha = true;
  texture.drawText(
    label,
    null,
    null,
    `${fontWeight} ${fontSize}px ${fontFamily}`,
    color,
    backgroundColor,
    true
  );
}

// render hemisphere light to 3d graphs
export function renderHemiLight(
  scene: Babylon.Scene,
  entityRefs?: Array<Babylon.Light>
): Babylon.Light | void {
  if (!scene.lights.some((light: Babylon.Light) => light.name === "hemi1")) {
    // lighting instantitation
    const light: Babylon.HemisphericLight = new Babylon.HemisphericLight(
      "hemi1",
      new Babylon.Vector3(0, 20, 0),
      scene
    );
    light.diffuse = new Babylon.Color3(1, 1, 1);
    light.groundColor = new Babylon.Color3(1, 1, 1);
    light.specular = new Babylon.Color3(0, 0, 0);

    return light;
  }
}