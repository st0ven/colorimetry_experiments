import express, { Express } from "express";
import bodyParser from "body-parser";
import * as dotenv from "dotenv";
import { ColorSpace, Illuminant, ColorModel } from "@lib/enums";
import {
  storeGeneratedMeshData,
  VertexDataFields,
  clearAllRecordsFromCollection,
  getMeshDataFor,
} from "../src/lib/mongo-query";
import { VertexData } from "babylonjs";

// allow environment variable access
dotenv.config();

// create Express app instance and define a local port
const app: Express = express();
const port: number = (process.env.PROXY || 3009) as number;

// local URL info for MongoDB
const dbNamespace: string = `color-space-mesh`;
const dbUrl: string = `mongodb://localhost:27017/${dbNamespace}`;
const dbName: string = process.env.MONGODB_NAME as string;

// MongoDb Atlast URL
const atlasUrl: string = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PWORD}@mephisto.y8d8h.gcp.mongodb.net/${process.env.MONGODB_NAME}?retryWrites=true&w=majority`;

// use this db reference
const useUrl: string = dbUrl;

// kick off server under async function to allow for awaiting MongoDB functions
(async function initServer() {
  const sourceMeshCollectionName: string = "reference-vertices";

  // clear out existing records on initial startup
  //await clearAllRecordsFromCollection(useUrl, dbName, sourceMeshCollectionName);
  await clearAllRecordsFromCollection(useUrl, dbName, "vertexData");
  await clearAllRecordsFromCollection(useUrl, dbName, "vertices");
  await clearAllRecordsFromCollection(useUrl, dbName, "colors");
  await clearAllRecordsFromCollection(useUrl, dbName, "facets");
  await clearAllRecordsFromCollection(useUrl, dbName, "positions");

  // initially cache some source geometry data if none exists
  // situation should arise on initial spin up of server
  await storeGeneratedMeshData(useUrl, dbName, sourceMeshCollectionName);

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
    const payload: string = JSON.stringify(
      await getMeshDataFor(useUrl, dbName, options)
    );

    // send back the response of the matching document
    res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
    res.send(JSON.stringify(payload));
  });

  app.get("/data/color-space/colors", async (request, response) => {
    try {
    } catch (error) {
      response.send(error);
    }
  });

  app.listen(port);
})();
