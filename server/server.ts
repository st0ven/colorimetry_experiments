import express, { Express } from "express";
import bodyParser from "body-parser";
import { MongoClient, Db, Collection, MongoError, Cursor } from "mongodb";
import * as dotenv from "dotenv";

import { Transform } from "../src/lib/color-transformations";
import { getBoxGeometry, trimVertices } from "../src/lib/vertices";
import { ColorSpace, ReferenceSpace } from "../src/lib/color-space";

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

    collection.deleteMany({ referenceSpace: "XYZ"});

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
})()

async function sendVertices(divisions: number): Promise<any> {
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
    //console.log('document', document.vertices);

    // trim the vertices list
    const trimmedDocument: any = Object.assign({}, document, {
      vertices: trimVertices(document.vertices, divisions),
    });

    return trimmedDocument;
  } catch (error) {
    console.log(error);
  }
}

sendVertices(2);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/data/color-space/vertices", async (request, res) => {
  //set hard cap on max number of divisions
  const maxDivisions: number = 64;

  // pull divisions query from request
  let { divisions = 24 }: any = request.query;

  // queries will always be extrated as astrings. convert to numeric type
  divisions = parseInt(divisions);

  // ensure this divisions query is bounded
  divisions = divisions > maxDivisions ? maxDivisions : divisions;

  // gather trimmed document data points
  const trimmedDocument: any = await sendVertices(divisions);

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
