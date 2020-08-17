import express, { Express } from "express";
import { VertexData } from "babylonjs";
import bodyParser from "body-parser";
import { MongoClient, Db, Collection, MongoError, Cursor } from "mongodb";
import * as dotenv from "dotenv";

import { Transform, expandRgbColor } from "../src/lib/color-transformations";
import {
  getBoxGeometry,
  mapPositionFromVertex,
  mapColorFromVertex,
  mapFacetsFromVertex,
  trimGeometry,
} from "../src/lib/vertices";
import { ColorSpace, Illuminant, ReferenceSpace } from "../src/lib/color-space";
import { flatten } from "../src/lib/math-conversion";

dotenv.config();

const app: Express = express();
const port: number = (process.env.PROXY || 3009) as number;

const dbUrl: string = "mongodb://localhost:27017";
const dbName: string | undefined = process.env.MONGODB_NAME;

// cache RGB color space mesh data if it does not already exist
(async function storeGeneratedMeshData() {
  try {
    // limit divisions to an 8 bit value
    const maxDivisions: number = Math.pow(2, 8);

    // establish connection to mongo
    const client: MongoClient = await new MongoClient(
      `${dbUrl}/color-space-mesh`
    ).connect();

    // get the db from the client
    const db: Db = client.db(dbName);

    // grab the collection of interest
    const collection: Collection = db.collection("vertices");

    collection.deleteMany({ referenceSpace: "XYZ" });

    // update document or insert if it doesnt exist
    if (!(await collection.find({ divisions: maxDivisions }).count())) {
      await collection.updateOne(
        { referenceSpace: "XYZ" },
        {
          $set: {
            divisions: maxDivisions,
            referenceSpace: "XYZ",
            vertices: getBoxGeometry(maxDivisions),
          },
        },
        { upsert: true }
      );
      console.log("updated source collection");
    }

    // close the connection
    client.close();

    // error handling
  } catch (error) {
    console.log(
      "Error encountered when initially populating / querying color space mesh data",
      error
    );
  }
})();

async function sendVertices(
  divisions: number,
  fromColorSpace: ColorSpace,
  fromReferenceSpace: ReferenceSpace,
  toReferenceSpace: ReferenceSpace,
  referenceIlluminant: Illuminant
): Promise<any> {
  try {
    const maxSLA: number = 5000;

    // establish connection to mongodb
    const client: MongoClient = await new MongoClient(
      `${dbUrl}/color-space-mesh`
    ).connect();

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

    const trimmedGeometry: number[][][] = trimGeometry(
      document.vertices,
      divisions
    );

    // determine what params to push along with the trannsformation method
    const transformParams: any[] =
      toReferenceSpace === ReferenceSpace.LCHuv
        ? [fromColorSpace, referenceIlluminant]
        : [fromColorSpace, { referenceIlluminant }];

    const positions: number[][][] = trimmedGeometry.map(
      (trimmedPlane: number[][]) =>
        trimmedPlane.map((vertex: number[]) =>
          mapPositionFromVertex(
            expandRgbColor(vertex),
            fromReferenceSpace,
            toReferenceSpace,
            transformParams
          )
        )
    );

    const facets: (false | number[])[][] = trimmedGeometry.map(
      (trimmedPlane: number[][], i: number) =>
        trimmedPlane
          .map((vertex: number[], j: number) => {
            // calculate indices algorithmically and push to list
            const pathLength: number = Math.sqrt(trimmedPlane.length);
            return trimmedPlane[j + pathLength] &&
              j % pathLength < pathLength - 1
              ? mapFacetsFromVertex(i * trimmedPlane.length + j, pathLength)
              : false;
          })
          .filter((n) => n)
    );

    const colors: number[][][] = trimmedGeometry.map(
      (trimmedPlane: number[][], i: number) =>
        trimmedPlane
          .map((vertex: number[], j: number) => {
            return mapColorFromVertex(
              expandRgbColor(vertex),
              fromColorSpace,
              referenceIlluminant
            );
          })
          .filter((n) => n)
    );

    const vertexData: VertexData = new VertexData();
    vertexData.positions = flatten(positions);
    vertexData.indices = flatten(facets);
    vertexData.colors = flatten(colors);

    return JSON.stringify(vertexData);
  } catch (error) {
    console.log(error);
  }
}

sendVertices(
  2,
  ColorSpace.sRGB,
  ReferenceSpace.RGB,
  ReferenceSpace.XYZ,
  Illuminant.D50
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/data/color-space/vertices", async (request, res) => {
  //set hard cap on max number of divisions
  const maxDivisions: number = 64;

  // pull divisions query from request
  let {
    divisions = 16,
    cspace = ColorSpace.sRGB,
    fspace = ReferenceSpace.RGB,
    tspace = ReferenceSpace.XYZ,
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
  res.send(JSON.stringify(trimmedDocument));
});

app.get("/data/color-space/colors", async (request, response) => {
  try {
  } catch (error) {
    response.send(error);
  }
});

app.listen(port);
