import * as Babylon from "babylonjs";
import { ColorSpace, ColorModel, Illuminant } from "@lib/color-constants";
import { getPolarCoordinatesFor } from "@lib/vertices";
import {
  expandRgbColor,
  normalizeLchColor,
  Transform,
} from "@lib/color-transformations";

// Renders an indicator within 3d space which utilizes a sphere. This sphere
// represents position of a given color mapped to a reference space as well as
// mapping a gamma corrected color to simulate chroma/value given a reference illuminant.
export function renderColorIndicator(
  rgb_color: number[],
  currentSpace: ColorSpace,
  toColorSpace: ColorModel = ColorModel.XYZ,
  referenceIlluminant: Illuminant,
  scene: Babylon.Scene
) {
  // hold a reference ot entity names to ne used in this render function
  const baseEntityName: string = "rgb-value-indicator";
  const sceneEntityNames: any = {
    transform: `transform.${baseEntityName}`,
    material: `material.${baseEntityName}`,
    mesh: `mesh.${baseEntityName}`,
  };

  // derive location in XYZ space of point center
  let pointPosition: number[] = Transform(ColorModel.RGB).to(ColorModel.XYZ)(
    expandRgbColor(rgb_color),
    currentSpace,
    referenceIlluminant
  );

  // locate position coordinates
  pointPosition =
    toColorSpace === ColorModel.LCHuv
      ? [
          Transform(ColorModel.LUV).to(ColorModel.LCHuv)(
            Transform(ColorModel.XYZ).to(ColorModel.LUV)(
              pointPosition,
              referenceIlluminant
            )
          ),
        ]
          .map((Lch_color: number[]) => normalizeLchColor(Lch_color))
          .map((normalizedColor: number[]) =>
            getPolarCoordinatesFor(normalizedColor)
          )
          .flat()
      : pointPosition;

  // derive normalized RGB color for the point within the current space
  // add companding flag to ensure proper gamma correction is applied
  const pointColor: number[] = Transform(ColorModel.RGB).to(ColorModel.XYZ)(
    expandRgbColor(rgb_color),
    currentSpace,
    referenceIlluminant
  );

  // Create a transform node, or reference one from a provided entity list.
  // set the transform position based on derived pointPosition.
  // This ultimately moves the sphere to the proper location within XYZ space
  // create new transform node
  const transformNode: Babylon.TransformNode =
    scene.getTransformNodeByName(sceneEntityNames.transform) ||
    new Babylon.TransformNode(sceneEntityNames.transform);

  // move the transformation node to align with the updated position
  transformNode.position.x = pointPosition[0];
  transformNode.position.y = pointPosition[1];
  transformNode.position.z = pointPosition[2];

  // find the material within the scene if it hasnt yet been created
  const material: Babylon.StandardMaterial =
    (scene.getMaterialByName(
      sceneEntityNames.material
    ) as Babylon.StandardMaterial) ||
    new Babylon.StandardMaterial(sceneEntityNames.material, scene);

  // apply the converted color as the material diffuse color
  material.diffuseColor = new Babylon.Color3(...pointColor);

  // search for the existing mesh name if any controls have been updated
  // or create a new one if none are found
  let mesh: Babylon.Mesh =
    (scene.getMeshByName(sceneEntityNames.mesh) as Babylon.Mesh) ||
    Babylon.SphereBuilder.CreateSphere(
      sceneEntityNames.mesh,
      { diameter: 0.04 },
      scene
    );

  // set mesh properties
  mesh.parent = transformNode;
  mesh.material = material;
  mesh.useVertexColors = true;
}
