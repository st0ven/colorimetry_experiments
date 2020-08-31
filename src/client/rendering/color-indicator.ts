import * as Babylon from "babylonjs";
import { ColorModel, ColorSpace, Illuminant } from "@lib/enums";
import { sceneEntityNames } from "@res/rendering-constants";
import { getPositionFromVertex, getColorFromVertex } from "@lib/vertices";
import {
  expandRgbColor,
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
  // use library method to determine position in 3d space given the relevant rendering parameters
  // for a given position expressed in normalized terms, expanded to RGB.
  const pointPosition: number[] = getPositionFromVertex(
    expandRgbColor(rgb_color),
    colorSpace,
    ColorModel.RGB,
    colorModel,
    referenceIlluminant
  ); 

  // derive the color which maps to the current renfering parameters to be applied to the indicator
  const pointColor: number[] = getColorFromVertex(
    expandRgbColor(rgb_color),
    colorSpace,
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
