import { VertexData } from "babylonjs";
import { MongoClient, Db, Collection, MongoClientOptions } from "mongodb";
import { ColorSpace, Illuminant, ColorModel, FidelityLevels } from "@lib/enums";
import { colorSpaceMap } from "@lib/constants.color";
import {
  generateColorSpaceGeometry,
  getTransformedColors,
  getTransformedFacets,
  getTransformedPositions,
  trimGeometry,
} from "@lib/vertices";
import { flatten } from "@lib/transform.matrices";

// A set of names to use while connecting to MongoDB instance for Collections
export enum MongoCollectionNames {
  cmfData = "reference-vertices",
  meshColors = "colors",
  meshFacets = "facets",
  meshPositions = "positions",
}

// describes a response object when connecting to a MongoDB instance
interface MongoConnectRespose {
  client: MongoClient;
  db: Db;
  collection: Collection;
}

// parameters required to generate a full query of data to fulfill the delivery
// of a VertexData (Babylon.js) filled response.
export interface VertexDataFields {
  fidelity: number;
  sourceSpace: ColorSpace;
  sourceModel?: ColorModel;
  referenceModel: ColorModel;
  referenceIlluminant: Illuminant;
  vertexData: VertexData;
}

// used as options when connecting to a MongoDB instance
const mongoClientOptions: MongoClientOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

/*
 given a collection name, this function will attempt to connect to a given
 dbUrl and dbName within a MongoDB instance, and will return a set of MongoDB objects
 relevant to that connection.
 */
async function getMongoCollection(
  dbUrl: string,
  dbName: string,
  collectionName: string
): Promise<MongoConnectRespose> {
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

/*
  Will look up or generate (and store) Color, Facet & Positional data for a 
  transformed mesh. Payload is structured in a CertexData format (Babylon.js) but is 
  ultimately stored and delivered as a string for simplified transport.
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
): Promise<VertexData> {
  // a ;ost pf cp;;ectopm ma,es tp ne ised when connectiong to Collections for fetching records.
  const collectionNames: MongoCollectionNames[] = [
    MongoCollectionNames.meshColors,
    MongoCollectionNames.meshFacets,
    MongoCollectionNames.meshPositions,
  ];

  // defines a list of parameters required to build data for Colors, Facets, Positions respectively
  const queryOptions: any[] = [
    { sourceSpace, referenceIlluminant },
    { fidelity, sourceSpace, referenceModel, referenceIlluminant },
    { sourceSpace, referenceModel, referenceIlluminant },
  ];

  // methods used to gather transformed data given a reference geometry. These
  // methods are unique for Color, Facet & Position data.
  const transformMethods: ((
    referenceGeometry: number[][][]
  ) => number[][][])[] = [
    (referenceGeometry: number[][][]) =>
      getTransformedColors(referenceGeometry, sourceSpace, referenceIlluminant),
    () => getTransformedFacets(fidelity),
    (referenceGeometry: number[][][]) =>
      getTransformedPositions(
        referenceGeometry,
        sourceSpace,
        sourceModel,
        referenceModel,
        referenceIlluminant
      ),
  ];

  // A list of connections that have been established with each Collection
  const connections: MongoConnectRespose[] = await Promise.all(
    collectionNames.map(
      async (collectionName: MongoCollectionNames) =>
        await getMongoCollection(dbUrl, dbName, collectionName)
    )
  );

  // a list of found documents given the parameters provided during invokation
  const foundDocuments: any[] = await Promise.all(
    connections.map(
      async ({ collection }: MongoConnectRespose, index: number) =>
        await collection.findOne(queryOptions[index])
    )
  );

  // Fetch the reference geometry as represented in XYZ space
  const referenceGeometry: number[][][] = await getReferenceMeshData(
    dbUrl,
    dbName
  );

  // Fetch, or alternatively build * store, relevant vertex data for Colors, Facets, Positions
  const documentData: number[][][][] = await Promise.all(
    foundDocuments.map(
      async (document: any, index: number): Promise<number[][][]> => {
        if (document) {
          return JSON.parse(document.data);
        } else {
          const data: number[][][] = transformMethods[index](referenceGeometry);

          const { collection }: MongoConnectRespose = connections[index];

          await collection.insertOne({
            ...queryOptions[index],
            data: JSON.stringify(data),
          });

          return data;
        }
      }
    )
  );

  // close all outstanding conenctions
  connections.forEach(({ client }: MongoConnectRespose) => client.close());

  // trim down the fidelity of Color, Position vertex data as determined by parameter `fidelity`.
  const trimmedColors: number[][][] = trimGeometry(documentData[0], fidelity);
  const trimmedPositions: number[][][] = trimGeometry(
    documentData[2],
    fidelity
  );

  // build the vertex data from collectively derived data
  const vertexData: VertexData = new VertexData();
  vertexData.colors = flatten(trimmedColors);
  vertexData.indices = flatten(documentData[1]);
  vertexData.positions = flatten(trimmedPositions);

  // return a stringified response
  return vertexData;
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

/*
  Fetch reference position data representing a cube in XYZ space representing
  the raw mesh data to be used for all transformation pruposes. This data is
  created once upon stand-up and stored within a MongoDB instance. 
*/
async function getReferenceMeshData(
  dbUrl: string,
  dbName: string
): Promise<number[][][]> {
  try {
    const {
      client,
      collection,
    }: MongoConnectRespose = await getMongoCollection(
      dbUrl,
      dbName,
      MongoCollectionNames.cmfData
    );

    const cmfRecord: any = await collection.findOne({
      referenceSpace: "XYZ",
    });

    const geometry: number[][][] = cmfRecord.vertices;

    client.close();

    return geometry;
  } catch (error) {
    throw new Error(`Error: unable to fetch record for CMF data from MongoDB`);
  }
}

// cache RGB color space mesh data if it does not already exist
export async function storeGeneratedMeshData(
  dbUrl: string,
  dbName: string,
  collectionName: string
) {
  // create instance to mongo client with url
  const { client, collection }: MongoConnectRespose = await getMongoCollection(
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
