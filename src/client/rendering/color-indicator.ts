import * as Babylon from "babylonjs";
import { colorModelMap } from "@lib/constants.color";
import { ColorModel, ColorSpace, Illuminant } from "@lib/enums";
import { getPolarCoordinatesFor } from "@lib/vertices";
import { sceneEntityNames } from "@res/rendering-constants";
import { GraphType } from "@lib/enums";
import {
  expandRgbColor,
  normalizeAnyColor,
  Transform,
} from "@lib/transform.colors";

// Renders an indicator within 3d space which utilizes a sphere. This sphere
// represents position of a given color mapped to a reference space as well as
// mapping a gamma corrected color to simulate chroma/value given a reference illuminant.
export function renderColorIndicator(
  rgb_color: number[],
  colorSpace: ColorSpace,
  colorModel: ColorModel = ColorModel.XYZ,
  referenceIlluminant: Illuminant,
  scene: Babylon.Scene
) {
  const transformParams = [
    expandRgbColor(rgb_color),
    colorSpace,
    referenceIlluminant,
  ];
  // derive location in XYZ space of point center
  let pointPosition: number[] = Transform(ColorModel.RGB).to(colorModel)(
    ...transformParams
  );

  // transform to polar coordinates if necessary
  // grabs property definitions from the colorModelMap which defines the grapht ype
  // of which that model should be represented in 3d space.
  pointPosition =
    colorModelMap.get(colorModel)?.graphType === GraphType.cylindrical
      ? getPolarCoordinatesFor(normalizeAnyColor(pointPosition, colorModel))
      : pointPosition;

  // derive normalized RGB color for the point within the current space
  // add companding flag to ensure proper gamma correction is applied
  const pointColor: number[] = Transform(ColorModel.RGB).to(ColorModel.XYZ)(
    ...transformParams
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
