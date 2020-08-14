import express, { Express } from "express";
import bodyParser from "body-parser";

// import {Transform} from "../src/helper/transformations";

const app: Express = express();
const port: any = process.env.PORT || 3009;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/transform/", (req, res) => {
  console.log("got req", req);
  res.send({ express: { value: [0, 0, 0] } });
});

app.listen(port);
