import { VertexData } from "babylonjs";
import { Illuminant, ReferenceSpace, ColorSpace } from "src/lib/color-space";
import { ClientRequest, ServerResponse } from "http";

const dataEndpoint: string = `/data/color-space`;

export async function fetchColorSpaceGeometry(
  divisions: number,
  toColorSpace: ColorSpace,
  fromReferenceSpace: ReferenceSpace,
  toReferenceSpace: ReferenceSpace,
  referenceIlluminant: Illuminant
): Promise<VertexData> {
  const apiUrl: string = `${dataEndpoint}/vertices?divisions=${divisions}&cspace=${toColorSpace}&fspace=${fromReferenceSpace}&tspace=${toReferenceSpace}&wp=${referenceIlluminant}`;

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
    throw Error(`${response.status}: error with back-end call`);
  }
}
