import { VertexData } from "babylonjs";
import { MongoClient, Db, Collection, MongoClientOptions } from "mongodb";
import { ColorSpace, Illuminant, ColorModel, FidelityLevels } from "@lib/enums";
import { colorSpaceMap } from "@lib/constants.color";
import {
  generateColorSpaceGeometry,
  //getColorFromVertex,
  getTransformedGeometryFrom,
  getTransformedColors,
  getTransformedFacets,
  getTransformedPositions,
  trimGeometry,
  trimPositions,
} from "@lib/vertices";
import { flatten } from "@lib/transform.matrices";

export enum MongoCollectionNames {
  cmfData = "reference-vertices",
  meshColors = "colors",
  meshFacets = "facets",
  meshPositions = "positions",
}

const mongoClientOptions: MongoClientOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

async function getMongoCollection(
  dbUrl: string,
  dbName: string,
  collectionName: string
) {
  // create instance to mongo client with url
  const client: MongoClient = new MongoClient(dbUrl, mongoClientOptions);

  // establish connection to mongo
  await client.connect();

  // get the db from the client
  const db: Db = client.db(dbName);

  // grab the collection of interest
  const collection: Collection = db.collection(collectionName);

  return {
    client,
    db,
    collection,
  };
}

// cache RGB color space mesh data if it does not already exist
export async function storeGeneratedMeshData(
  dbUrl: string,
  dbName: string,
  collectionName: string
) {
  // create instance to mongo client with url
  const { client, collection } = await getMongoCollection(
    dbUrl,
    dbName,
    collectionName
  );

  // check if document for source color space already exists
  const document: any = await collection.findOne({ referenceSpace: "XYZ" });

  // update document or insert if it doesnt exist
  if (!document) {
    // maximum number of vertex for each face row
    const maxDivisions: number = FidelityLevels.high;

    // get default info to store with the reference vertices
    const defaultColorSpace: ColorSpace = ColorSpace.sRGB;
    const defaultReferenceModel: ColorModel = ColorModel.XYZ;
    const defaultReferenceIlluminant: Illuminant =
      colorSpaceMap.get(ColorSpace.sRGB)?.illuminant || Illuminant.D50;

    // build document properties object to include with vertices
    const documentFields: any = {
      divisions: maxDivisions,
      referenceIlluminant: defaultReferenceIlluminant,
      referenceSpace: defaultReferenceModel,
      sourceSpace: defaultColorSpace,
    };

    // attempt to push the document into the collection
    try {
      const referenceGeometry: number[][][] = generateColorSpaceGeometry(
        maxDivisions
      );

      await collection.insertOne({
        ...documentFields,
        vertices: referenceGeometry,
      });

      //await storeMeshDataToDb(referenceGeometry, dbUrl, dbName);
    } catch (error) {
      throw error;
    }
  }

  // close the connection
  client.close();
}

export interface VertexDataFields {
  fidelity: number;
  sourceSpace: ColorSpace;
  sourceModel?: ColorModel;
  referenceModel: ColorModel;
  referenceIlluminant: Illuminant;
  vertexData: VertexData;
}

async function getCmfDataFor(
  dbUrl: string,
  dbName: string
): Promise<number[][][]> {
  try {
    const cmfConnection: any = await getMongoCollection(
      dbUrl,
      dbName,
      MongoCollectionNames.cmfData
    );

    const cmfRecord: any = await cmfConnection.collection.findOne({
      referenceSpace: "XYZ",
    });

    const geometry: number[][][] = cmfRecord.vertices;

    cmfConnection.client.close();

    return geometry;
  } catch (error) {
    throw new Error(`Error: unable to fetch record for CMF data from MongoDB`);
  }
}

/*
export async function getColorDataFor(
  dbUrl: string,
  dbName: string,
  { sourceSpace, referenceIlluminant }: any
): Promise<any> {
  const colorsConnection: any = await getMongoCollection(
    dbUrl,
    dbName,
    MongoCollectionNames.meshColors
  );

  let record: any = await colorsConnection.collection.findOne({
    sourceSpace,
    referenceIlluminant,
  });

  if (!record) {
    try {
      const geometry: number[][][] = await getCmfDataFor(dbUrl, dbName);

      if (geometry) {
        const colorData: number[] = flatten(
          geometry.map((face: number[][]) =>
            face.map((vertex: number[]) =>
              getColorFromVertex(vertex, sourceSpace, referenceIlluminant)
            )
          )
        );

        record = {
          sourceSpace,
          referenceIlluminant,
          data: flatten(colorData),
        };

        await colorsConnection.collection.insertOne(record);
      }
    } catch (error) {
      throw new Error(
        `Error encountered when fetching color data Record from MongoDB with filters: ${sourceSpace}, ${referenceIlluminant}`
      );
    }
  }
  await colorsConnection.client.close();

  return record;
}
*/

export async function getMeshDataFor(
  dbUrl: string,
  dbName: string,
  {
    fidelity,
    sourceSpace,
    sourceModel = ColorModel.RGB,
    referenceModel,
    referenceIlluminant,
  }: VertexDataFields
): Promise<string> {
  const colorsConnection: any = await getMongoCollection(
    dbUrl,
    dbName,
    MongoCollectionNames.meshColors
  );

  const colorsDocument: any = await colorsConnection.collection.findOne({
    sourceSpace,
    referenceIlluminant,
  });

  const facetsConnection: any = await getMongoCollection(
    dbUrl,
    dbName,
    MongoCollectionNames.meshFacets
  );

  const facetsDocument: any = await facetsConnection.collection.findOne({
    fidelity,
    sourceSpace,
    referenceModel,
    referenceIlluminant,
  });

  const positionsConnection: any = await getMongoCollection(
    dbUrl,
    dbName,
    MongoCollectionNames.meshPositions
  );

  const positionsDocument: any = await positionsConnection.collection.findOne({
    sourceSpace,
    referenceModel,
    referenceIlluminant,
  });

  const referenceGeometry: number[][][] =
    !colorsDocument || !facetsConnection || !positionsDocument
      ? await getCmfDataFor(dbUrl, dbName)
      : [];

  const colors: number[][][] = colorsDocument
    ? JSON.parse(colorsDocument.data)
    : getTransformedColors(referenceGeometry, sourceSpace, referenceIlluminant);

  const facets: number[][][] = facetsDocument
    ? JSON.parse(facetsDocument.data)
    : getTransformedFacets(fidelity);

  const positions: number[][][] = positionsDocument
    ? JSON.parse(positionsDocument.data)
    : getTransformedPositions(
        referenceGeometry,
        sourceSpace,
        sourceModel,
        referenceModel,
        referenceIlluminant
      );

  /*
  const geometry: any = getTransformedGeometryFrom(
    referenceGeometry,
    sourceSpace,
    sourceModel,
    referenceModel,
    referenceIlluminant,
    {
      colors,
      facets,
      positions,
    }
  );
  */

  if (!colors) {
    await colorsConnection.collection.insertOne({
      sourceSpace,
      referenceIlluminant,
      data: JSON.stringify(colors),
    });
  }
  if (!facets) {
    await facetsConnection.collection.insertOne({
      fidelity,
      sourceSpace,
      referenceModel,
      referenceIlluminant,
      data: JSON.stringify(facets),
    });
  }
  if (!positions) {
    await positionsConnection.collection.insertOne({
      sourceSpace,
      referenceModel,
      referenceIlluminant,
      data: JSON.stringify(positions),
    });
  }

  colorsConnection.client.close();
  facetsConnection.client.close();
  positionsConnection.client.close();

  const trimmedColors: number[][][] = trimGeometry(colors, fidelity);
  const trimmedPositions: number[][][] = trimGeometry(positions, fidelity);  

  const vertexData: VertexData = new VertexData();
  vertexData.colors = flatten(trimmedColors);
  vertexData.indices = flatten(facets);
  vertexData.positions = flatten(trimmedPositions);

  return JSON.stringify(vertexData);
}

/*
export async function getVertexDataFor(
  dbUrl: string,
  dbName: string,
  {
    fidelity,
    sourceSpace,
    sourceModel = ColorModel.RGB,
    referenceModel,
    referenceIlluminant,
  }: VertexDataFields
): Promise<string> {
  const collectionName = "vertexData";

  // create instance to mongo client with url
  let { client, db, collection } = await getMongoCollection(
    dbUrl,
    dbName,
    collectionName
  );

  // find any matching records with this specific set of parameters reflecting the
  // current selection state of options from the UI.
  let document: any = await collection.findOne({
    fidelity,
    sourceSpace,
    referenceModel,
    referenceIlluminant,
  });

  // this query has been ran and cached previously
  if (document) {
    console.log("previous record found");

    // end the connection
    client.close();

    // return stringified result from MongoDB
    return JSON.stringify(document.vertexData);
  } else {
    console.log("no records found, creating new record");

    // grab the collection holding vertices data
    collection = db.collection("reference-vertices");

    // find the collection with the matched number of divisions
    document = await collection.findOne({
      referenceSpace: "XYZ",
    });

    // grab a collection of vertices in a 3D matrix that trims from the
    // source geometry. Divisions must be a power of 2.
    const trimmedGeometry: number[][][] = trimGeometry(
      document.vertices,
      fidelity
    );

    // gather vertex data from trimmed geometry as Babylon.VertexData object
    const vertexData: VertexData = getTransformedGeometryFrom(
      trimmedGeometry,
      sourceSpace,
      sourceModel,
      referenceModel,
      referenceIlluminant
    );

    // given this is new, store this derived data as a record in the data base.
    // this saves on subsequent calculation costs for other hits to the server.
    storeVertexDataAsRecord(dbUrl, dbName, "positions", {
      vertexData,
      fidelity,
      sourceSpace,
      referenceModel,
      referenceIlluminant,
    });

    // close the connection
    client.close();

    // return a stringified version of the vertex data back to callee
    return JSON.stringify(vertexData);
  }
}
*/

/*
async function storeVertexDataAsRecord(
  dbUrl: string,
  dbName: string,
  collectionName: string,
  recordData: VertexDataFields
) {
  const { collection } = await getMongoCollection(
    dbUrl,
    dbName,
    collectionName
  );

  await collection.insertOne(recordData);
}
*/

// Remove all records from a mongo collection. Requires the database URI,
// database name of which the collection lives, and collection name
export async function clearAllRecordsFromCollection(
  dbUrl: string,
  dbName: string,
  collectionName: string
) {
  const { collection } = await getMongoCollection(
    dbUrl,
    dbName,
    collectionName
  );

  collection.deleteMany({});
}

/*
export async function storeMeshDataToDb(
  geometry: number[][][],
  dbUrl: string,
  dbName: string
) {
  const positionsCollection: Collection = (
    await getMongoCollection(dbUrl, dbName, "positions")
  ).collection;

  const facetsCollection: Collection = (
    await getMongoCollection(dbUrl, dbName, "facets")
  ).collection;

  const colorsCollection: Collection = (
    await getMongoCollection(dbUrl, dbName, "colors")
  ).collection;

  const sourceColorModel: ColorModel = ColorModel.RGB;

  for (let key in ColorSpace) {
    const sourceColorSpace: ColorSpace = Object(ColorSpace)[key];

    for (let key in Illuminant) {
      const whitepoint: Illuminant = Object(Illuminant)[key];

      for (let key in ColorModel) {
        const targetColorModel: ColorModel = Object(ColorModel)[key];

        const colorsRecordFields: any = {
          sourceColorSpace,
          whitepoint,
        };
        const positionsRecordFields: any = {
          ...colorsRecordFields,
          targetColorModel,
        };

        const {
          positions,
          indices,
          colors,
        }: VertexData = getTransformedGeometryFrom(
          geometry,
          sourceColorSpace,
          sourceColorModel,
          targetColorModel,
          whitepoint
        );

        const positionsRecord: any = {
          ...positionsRecordFields,
          vertices: positions,
        };

        const facetsRecord: any = {
          ...positionsRecordFields,
          facets: indices,
        };

        const colorsRecord: any = {
          ...colorsRecordFields,
          colors: colors,
        };

        if (!(await positionsCollection.findOne(positionsRecordFields))) {
          await positionsCollection.insertOne(positionsRecord);
        }
        if (!(await facetsCollection.findOne(positionsRecordFields))) {
          await facetsCollection.insertOne(facetsRecord);
        }
        if (!(await colorsCollection.findOne(colorsRecordFields))) {
          await colorsCollection.insertOne(colorsRecord);
        }

        console.log(
          `pushed records for ${sourceColorSpace}, ${targetColorModel}, ${whitepoint}`
        );
      }
    }
  }
}
*/
