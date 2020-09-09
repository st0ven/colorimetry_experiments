import { VertexData } from "babylonjs";
import { Illuminant, ColorModel, ColorSpace } from "@lib/enums";

const dataEndpoint: string = `/data/color-space`;

export async function fetchColorSpaceGeometry(
  divisions: number,
  toColorSpace: ColorSpace,
  fromColorModel: ColorModel,
  toColorModel: ColorModel,
  referenceIlluminant: Illuminant
): Promise<VertexData | undefined> {
  const apiUrl: string = `${dataEndpoint}/vertices?divisions=${divisions}&cspace=${toColorSpace}&fspace=${fromColorModel}&tspace=${toColorModel}&wp=${referenceIlluminant}`;

  const headers: Headers = new Headers([
    ["method", "GET"],
    ["Cache-Control", "private, max-age=3600"],
  ]);

  const init: RequestInit = {
    headers,
  };

  const response: Response = await fetch(apiUrl, init);

  if (response.status === 200) {
    const body: any = JSON.parse(await response.json());

    const data: VertexData = new VertexData();

    return Object.assign(data, body);
  } else {
    console.warn(`${response.status}: error with back-end call`);

    return undefined;
  }
}
