import { VertexData } from "babylonjs";
import { MongoClient, Db, Collection, MongoClientOptions } from "mongodb";
import { ColorSpace, Illuminant, ColorModel } from "@lib/enums";
import { colorSpaceMap } from "@lib/constants.color";
import {
  generateColorSpaceGeometry,
  getTransformedVertexDataFromGeometry,
  trimGeometry,
} from "@lib/vertices";

const mongoClientOptions: MongoClientOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

const defaultColorSpace: ColorSpace = ColorSpace.sRGB;
const defaultReferenceModel: ColorModel = ColorModel.XYZ;
const defaultReferenceIlluminant: Illuminant =
  colorSpaceMap.get(ColorSpace.sRGB)?.illuminant || Illuminant.D50;

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
export async function storeGeneratedMeshData(dbUrl: string, dbName: string) {
  // maximum number of vertex for each face row
  const maxDivisions = Math.pow(2, 8);

  // name of collection within MongoDB
  const collectionName: string = "vertices";

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
    try {
      await collection.insertOne({
        divisions: maxDivisions,
        referenceIlluminant: defaultReferenceIlluminant,
        referenceSpace: defaultReferenceModel,
        sourceSpace: defaultColorSpace,
        vertices: generateColorSpaceGeometry(maxDivisions),
      });
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
    console.log('no records found, creating new record');
    // grab the collection holding vertices data
    collection = db.collection("vertices");

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
    const vertexData: VertexData = getTransformedVertexDataFromGeometry(
      trimmedGeometry,
      sourceSpace,
      sourceModel,
      referenceModel,
      referenceIlluminant
    );

    // given this is new, store this derived data as a record in the data base.
    // this saves on subsequent calculation costs for other hits to the server.
    storeVertexDataAsRecord(dbUrl, dbName, {
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

async function storeVertexDataAsRecord(
  dbUrl: string,
  dbName: string,
  recordData: VertexDataFields
) {
  const { collection } = await getMongoCollection(dbUrl, dbName, "vertexData");

  await collection.insertOne(recordData);
}

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
