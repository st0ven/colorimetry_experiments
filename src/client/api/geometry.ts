const dataEndpoint: string = `/data/color-space`;

export async function fetchColorSpaceGeometry(
  divisions: number
): Promise<number[][][]> {
  const response: Response = await fetch(
    `${dataEndpoint}/vertices?divisions=${divisions}`
  );
  if (response.status === 200) {
    const body: any = await response.json();
    return body.vertices;
  } else {
    throw Error(`${response.status}: error with back-end call`);
  }
}
