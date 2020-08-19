import express, { Express } from "express";
import { VertexData } from "babylonjs";
import bodyParser from "body-parser";
import { MongoClient, Db, Collection, MongoClientOptions } from "mongodb";
import * as dotenv from "dotenv";
import { ColorSpace, Illuminant, ColorModel } from "../src/lib/color-constants";
import {
  generateColorSpaceGeometry,
  getTransformedVertexDataFromGeometry,
  trimGeometry,
} from "../src/lib/vertices";

dotenv.config();

const app: Express = express();
const port: number = (process.env.PROXY || 3009) as number;

const dbUrl: string = "mongodb://localhost:27017/";
const dbName: string | undefined = process.env.MONGODB_NAME;

const mongoClientOptions: MongoClientOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

// cache RGB color space mesh data if it does not already exist
(async function storeGeneratedMeshData() {
  // create instance to mongo client with url
  const client: MongoClient = new MongoClient(
    `${dbUrl}/color-space-mesh`,
    mongoClientOptions
  );

  // limit divisions to an 8 bit value
  const maxDivisions: number = Math.pow(2, 8);

  // establish connection to mongo
  await client.connect();

  // get the db from the client
  const db: Db = client.db(dbName);

  // grab the collection of interest
  const collection: Collection = db.collection("vertices");

  // check if document for source color space already exists
  const document: any = await collection.findOne({ referenceSpace: "XYZ" });

  // update document or insert if it doesnt exist
  if (!document) {
    try {
      await collection.insertOne({
        divisions: maxDivisions,
        referenceSpace: "XYZ",
        vertices: generateColorSpaceGeometry(maxDivisions),
      });
    } catch (error) {
      throw error;
    }
  }

  // close the connection
  client.close();
})();

async function sendVertices(
  divisions: number,
  fromColorSpace: ColorSpace,
  fromColorModel: ColorModel,
  toColorModel: ColorModel,
  referenceIlluminant: Illuminant
): Promise<any> {
  const maxSLA: number = 15000;

  // establish connection to mongodb
  const client: MongoClient = new MongoClient(
    `${dbUrl}/color-space-mesh`,
    mongoClientOptions
  );

  await client.connect();

  // get the reference db holding geometry information
  const db: Db = client.db(dbName);

  // grab the collection holding vertices data
  const collection: Collection = db.collection("vertices");

  // find the collection with the matched number of divisions
  const document: any = await collection.findOne(
    {
      referenceSpace: "XYZ",
    },
    { maxTimeMS: maxSLA }
  );

  // grab a collection of vertices in a 3D matrix that trims from the
  // source geometry. Divisions must be a power of 2.
  const trimmedGeometry: number[][][] = trimGeometry(
    document.vertices,
    divisions
  );

  const vertexData: VertexData = getTransformedVertexDataFromGeometry(
    trimmedGeometry,
    fromColorSpace,
    fromColorModel,
    toColorModel,
    referenceIlluminant
  );

  client.close();

  return JSON.stringify(vertexData);
}

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

app.get("/data/color-space/vertices", async (request, res) => {
  //set hard cap on max number of divisions
  const maxDivisions: number = 64;

  // pull divisions query from request
  let {
    divisions = 16,
    cspace = ColorSpace.sRGB,
    fspace = ColorModel.RGB,
    tspace = ColorModel.XYZ,
    wp = Illuminant.D50,
  }: any = request.query;

  // queries will always be extrated as astrings. convert to numeric type
  divisions = parseInt(divisions);

  // ensure this divisions query is bounded
  divisions = divisions > maxDivisions ? maxDivisions : divisions;

  // gather trimmed document data points
  const trimmedDocument: any = await sendVertices(
    divisions,
    cspace,
    fspace,
    tspace,
    wp
  );

  // send back the response of the matching document
  res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
  res.send(JSON.stringify(trimmedDocument));
});

app.get("/data/color-space/colors", async (request, response) => {
  try {
  } catch (error) {
    response.send(error);
  }
});

app.listen(port);
