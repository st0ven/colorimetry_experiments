import * as Babylon from "babylonjs";

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
