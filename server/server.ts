import express, { Express } from "express";
import bodyParser from "body-parser";
import * as dotenv from "dotenv";
import { ColorSpace, Illuminant, ColorModel } from "../src/lib/color-constants";
import {
  storeGeneratedMeshData,
  getVertexDataFor,
  VertexDataFields,
} from "../src/lib/mongo-query";

if (!process.env.MONGODB_NAME) {
  console.warn(`Warning: No MongoDB name was found as an environment variable`);
}

dotenv.config();

const app: Express = express();
const port: number = (process.env.PROXY || 3009) as number;

const dbNamespace: string = `color-space-mesh`;
const dbUrl: string = `mongodb://localhost:27017/${dbNamespace}`;
const dbName: string = process.env.MONGODB_NAME as string;

// initially cache some source geometry data if none exists
// situation should arise on initial spin up of server
storeGeneratedMeshData(dbUrl, dbName);
//clearVertexDataDb(dbUrl, dbName);

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

  const options: VertexDataFields = {
    fidelity: divisions,
    sourceSpace: cspace,
    sourceModel: fspace,
    referenceModel: tspace,
    referenceIlluminant: wp,
  } as VertexDataFields;

  // gather trimmed document data points
  const trimmedDocument: any = await getVertexDataFor(dbUrl, dbName, options);

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
